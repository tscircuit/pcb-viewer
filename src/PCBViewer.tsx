import { applyEditEvents } from "@tscircuit/core";
import { findBoundsAndCenter } from "@tscircuit/soup-util";
import type { AnyCircuitElement, SourceTrace } from "circuit-json";
import { ContextProviders } from "./components/ContextProviders";
import type { StateProps } from "./global-store";
import type { GraphicsObject } from "graphics-debug";
import { ToastContainer } from "lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMeasure } from "react-use";
import { compose, scale, translate, applyToPoint } from "transformation-matrix";
import useMouseMatrixTransform from "use-mouse-matrix-transform";
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer";
import type { ManualEditEvent } from "@tscircuit/props";
import { zIndexMap } from "lib/util/z-index-map";
import { calculateCircuitJsonKey } from "lib/calculate-circuit-json-key";
import { EditBoardOverlay } from "./components/EditBoardOverlay";

const defaultTransform = compose(translate(400, 300), scale(40, -40));

type Props = {
  circuitJson?: AnyCircuitElement[];
  height?: number;
  allowEditing?: boolean;
  boardSnapMm?: number;
  editEvents?: ManualEditEvent[];
  initialState?: Partial<StateProps>;
  onEditEventsChanged?: (editEvents: ManualEditEvent[]) => void;
  focusOnHover?: boolean;
  clickToInteractEnabled?: boolean;
  debugGraphics?: GraphicsObject | null;
  disablePcbGroups?: boolean;
  boardMinSizeMn?: number;
};

export const PCBViewer = ({
  circuitJson,
  debugGraphics,
  height = 600,
  initialState,
  boardSnapMm = 1,
  allowEditing = true,
  editEvents: editEventsProp,
  onEditEventsChanged,
  focusOnHover = false,
  clickToInteractEnabled = false,
  disablePcbGroups = false,
  boardMinSizeMn = 5
}: Props) => {
  const [isInteractionEnabled, setIsInteractionEnabled] = useState(
    !clickToInteractEnabled
  );
  const [ref, refDimensions] = useMeasure();
  const [transform, setTransformInternal] = useState(defaultTransform);
  const {
    ref: transformRef,
    setTransform,
    cancelDrag: cancelPanDrag,
  } = useMouseMatrixTransform({
    transform,
    onSetTransform: setTransformInternal,
    enabled: isInteractionEnabled,
  });

  let [editEvents, setEditEvents] = useState<ManualEditEvent[]>([]);
  editEvents = editEventsProp ?? editEvents;

  const initialRenderCompleted = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const circuitJsonKey = useMemo(
    () => calculateCircuitJsonKey(circuitJson),
    [circuitJson]
  );

  // ---- Undo stack for ESC-after-release
  const undoRef = useRef<
    {
      size?: { width: number; height: number };
      offset: { x: number; y: number };
    }[]
  >([]);

  // ---- Base elements (pcb_ + source_) BEFORE viewer-local board edits
  const pcbElmsPreEdit = useMemo(() => {
    return (
      circuitJson?.filter(
        (e: any) => e.type.startsWith("pcb_") || e.type.startsWith("source_")
      ) ?? []
    );
  }, [circuitJsonKey]);

  const elementsCoreApplied = useMemo(() => {
    return applyEditEvents({
      circuitJson: pcbElmsPreEdit as any,
      editEvents,
    });
  }, [pcbElmsPreEdit, editEvents]);

  // ---- Extract viewer-local board edits from editEvents
  const boardEdits = useMemo(() => {
    let size: { width: number; height: number } | undefined;
    let offset = { x: 0, y: 0 };

    for (const e of editEvents as any[]) {
      if (e?.type === "board_size_edit" && typeof e.width === "number") {
        size = { width: e.width, height: e.height };
      } else if (e?.type === "board_offset_edit" && e.offset) {
        offset.x += e.offset.x || 0;
        offset.y += e.offset.y || 0;
      }
    }
    return { size, offset };
  }, [editEvents]);

  // ---- Apply size override to board element (viewer-local)
  const elementsFinal = useMemo(() => {
    if (!boardEdits.size) return elementsCoreApplied as AnyCircuitElement[];
    const { width, height } = boardEdits.size;
    return (elementsCoreApplied as AnyCircuitElement[]).map((el: any) =>
      el?.type === "pcb_board" ? { ...el, width, height } : el
    );
  }, [elementsCoreApplied, boardEdits.size]);

  // ---- Apply offset as an extra world-translation in the view transform
  const effectiveTransform = useMemo(() => {
    const off = boardEdits.offset;
    if (!off || (off.x === 0 && off.y === 0)) return transform;
    // screen = transform * translate(offset) * world
    return compose(transform, translate(off.x, off.y));
  }, [transform, boardEdits.offset.x, boardEdits.offset.y]);

  // ---- Compute a screen-space board rect for the overlay (after our edits)
  const boardRect = useMemo(() => {
    const pcbBoardEls = (elementsFinal as any[]).filter(
      (e) => e.type === "pcb_board"
    );
    if (pcbBoardEls.length === 0) return undefined;

    const { center, width, height } = findBoundsAndCenter(pcbBoardEls as any);
    const topLeftWorld = { x: center.x - width / 2, y: center.y - height / 2 };
    const bottomRightWorld = {
      x: center.x + width / 2,
      y: center.y + height / 2,
    };

    const tl = applyToPoint(effectiveTransform, topLeftWorld);
    const br = applyToPoint(effectiveTransform, bottomRightWorld);

    const left = Math.min(tl.x, br.x);
    const top = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x);
    const h = Math.abs(br.y - tl.y);

    return { x: left, y: top, width: w, height: h };
  }, [elementsFinal, effectiveTransform]);

  // ---- Fit view helper (uses post-edit elements)
  const resetTransform = () => {
    const elmBounds =
      refDimensions?.width > 0 ? refDimensions : { width: 500, height: 500 };
    const { center, width, height } = elementsFinal.some((e) =>
      e.type.startsWith("pcb_")
    )
      ? findBoundsAndCenter(
          elementsFinal.filter((e) => e.type.startsWith("pcb_")) as any
        )
      : { center: { x: 0, y: 0 }, width: 0.001, height: 0.001 };
    const scaleFactor =
      Math.min(
        (elmBounds.width ?? 0) / width,
        (elmBounds.height ?? 0) / height,
        100
      ) * 0.75;

    const targetTransform = compose(
      translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
      scale(scaleFactor, -scaleFactor, 0, 0),
      translate(-center.x, -center.y)
    );

    setTransform(targetTransform);
  };

  // ---- initial fit
  useEffect(() => {
    if (!refDimensions?.width) return;
    if (!circuitJson) return;
    if (circuitJson.length === 0) return;

    if (!initialRenderCompleted.current) {
      resetTransform();
      initialRenderCompleted.current = true;
    }
  }, [circuitJson, refDimensions, elementsFinal]);

  // ---- ESC-to-undo (post-release)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isEsc =
        e.key === "Escape" || e.code === "Escape" || (e as any).keyCode === 27;
      if (!isEsc) return;
      if (undoRef.current.length === 0) return;

      e.preventDefault();
      e.stopPropagation();

      const prev = undoRef.current.pop()!;
      const base = (editEvents as any[]).filter(
        (ev) => ev.type !== "board_size_edit" && ev.type !== "board_offset_edit"
      );

      const additions: any[] = [];
      if (prev.offset && (prev.offset.x !== 0 || prev.offset.y !== 0)) {
        additions.push({
          type: "board_offset_edit",
          edit_event_id: `board-offset-undo`,
          offset: { x: prev.offset.x, y: prev.offset.y },
        });
      }
      if (prev.size) {
        additions.push({
          type: "board_size_edit",
          edit_event_id: `board-size-undo`,
          width: prev.size.width,
          height: prev.size.height,
        });
      }

      const newEvents = [...base, ...additions] as unknown as ManualEditEvent[];
      setEditEvents(newEvents);
      onEditEventsChanged?.(newEvents);
      console.log("[EditBoard] undo -> restored:", additions);
    };

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [editEvents, onEditEventsChanged]);

  const onCreateEditEvent = (event: ManualEditEvent) => {
    setEditEvents([...editEvents, event]);
    onEditEventsChanged?.([...editEvents, event]);
  };
  const onModifyEditEvent = (modifiedEvent: Partial<ManualEditEvent>) => {
    const newEditEvents: ManualEditEvent[] = editEvents.map((e) =>
      e.edit_event_id === modifiedEvent.edit_event_id
        ? ({ ...e, ...modifiedEvent } as ManualEditEvent)
        : e
    );
    setEditEvents(newEditEvents);
    onEditEventsChanged?.(newEditEvents);
  };

  const mergedInitialState = useMemo(
    () => ({
      ...initialState,
      ...(disablePcbGroups && { is_showing_pcb_groups: false }),
    }),
    [initialState, disablePcbGroups]
  );

  // helper to generate ids for our local board events
  const _mkId = () => Math.random().toString(36).slice(2, 10);

  return (
    <div ref={transformRef as any} style={{ position: "relative" }}>
      <div ref={ref as any}>
        <ContextProviders
          initialState={mergedInitialState}
          disablePcbGroups={disablePcbGroups}
        >
          <CanvasElementsRenderer
            key={refDimensions.width}
            transform={effectiveTransform}
            height={height}
            width={refDimensions.width}
            allowEditing={allowEditing}
            focusOnHover={focusOnHover}
            cancelPanDrag={cancelPanDrag}
            onCreateEditEvent={onCreateEditEvent}
            onModifyEditEvent={onModifyEditEvent}
            grid={{
              spacing: 1,
              view_window: {
                left: 0,
                right: refDimensions.width || 500,
                top: height,
                bottom: 0,
              },
            }}
            elements={elementsFinal as SourceTrace[]}
            debugGraphics={debugGraphics}
          />

          {/* Edit Board overlay */}
          <EditBoardOverlay
            boardRect={boardRect}
            transform={effectiveTransform}
            onProposeEdit={(proposal) => {
              // ---- snapshot current applied edits for undo
              undoRef.current.push({
                size: boardEdits.size ? { ...boardEdits.size } : undefined,
                offset: { ...boardEdits.offset },
              });
              if (undoRef.current.length > 50) undoRef.current.shift();

              // snap helper (1 mm grid)
              const spacing = boardSnapMm;    
              const snap = (v: number) => Math.round(v / spacing) * spacing;

              // snapped + clamped copy
              const prop = { ...proposal };
              if (prop.offset) {
                prop.offset = {
                  x: snap(prop.offset.x),
                  y: snap(prop.offset.y),
                };
              }
              if (prop.size) {
                prop.size = {
                  width: Math.max(boardMinSizeMn, prop.size.width),
                  height: Math.max(boardMinSizeMn, prop.size.height),
                };
              }

              // remove prior board_* edits; coalesce to one of each
              const base = (editEvents as any[]).filter(
                (e) =>
                  e.type !== "board_size_edit" && e.type !== "board_offset_edit"
              );

              const additions: any[] = [];

              // current applied values
              const curOffset = boardEdits.offset;
              const curSize = boardEdits.size;

              // OFFSET: cumulative total (only if changed)
              if (prop.offset) {
                const combined = {
                  x: snap(curOffset.x + prop.offset.x),
                  y: snap(curOffset.y + prop.offset.y),
                };
                const offsetChanged =
                  combined.x !== curOffset.x || combined.y !== curOffset.y;
                if (offsetChanged) {
                  additions.push({
                    type: "board_offset_edit",
                    edit_event_id: `board-offset-${_mkId()}`,
                    offset: combined,
                  });
                }
              }

              // SIZE: latest absolute size (only if changed)
              if (prop.size) {
                const sizeChanged =
                  !curSize ||
                  curSize.width !== prop.size.width ||
                  curSize.height !== prop.size.height;

                if (sizeChanged) {
                  additions.push({
                    type: "board_size_edit",
                    edit_event_id: `board-size-${_mkId()}`,
                    width: prop.size.width,
                    height: prop.size.height,
                  });
                }
              }

              if (additions.length === 0) return;

              const newEvents = [
                ...base,
                ...additions,
              ] as unknown as ManualEditEvent[];
              setEditEvents(newEvents);
              onEditEventsChanged?.(newEvents);

              console.log(
                "[EditBoard] emitted (snapped, min-clamped, coalesced):",
                additions
              );
            }}
          />

          <ToastContainer />
        </ContextProviders>
      </div>
      {clickToInteractEnabled && !isInteractionEnabled && (
        <div
          onClick={() => {
            setIsInteractionEnabled(true);
            resetTransform();
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
            };
          }}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0];
            const start = touchStartRef.current;
            if (!start) return;

            const deltaX = Math.abs(touch.clientX - start.x);
            const deltaY = Math.abs(touch.clientY - start.y);

            if (deltaX < 10 && deltaY < 10) {
              e.preventDefault();
              setIsInteractionEnabled(true);
              resetTransform();
            }

            touchStartRef.current = null;
          }}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            zIndex: zIndexMap.clickToInteractOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "pan-x pan-y pinch-zoom",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              pointerEvents: "none",
            }}
          >
            {typeof window !== "undefined" &&
            ("ontouchstart" in window || navigator.maxTouchPoints > 0)
              ? "Touch to Interact"
              : "Click to Interact"}
          </div>
        </div>
      )}
    </div>
  );
};
