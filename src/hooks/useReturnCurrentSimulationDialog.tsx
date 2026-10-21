import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import {
  ReturnCurrentSimulationDialog,
  type ReturnCurrentSimulationDialogResult,
} from "../components/ReturnCurrentSimulationDialog"
import type {
  ReturnCurrentSimulationClient,
  ReturnCurrentSimulationJob,
} from "../lib/return-current-client"
import type {
  ReturnCurrentSimulationOptions,
  SimulateReturnCurrentEvent,
} from "../lib/return-current-simulation"
import { zIndexMap } from "../lib/util/z-index-map"

/** Transport and optional host persistence for the built-in simulation dialog. */
export interface ReturnCurrentSimulationDialogOptions {
  client: ReturnCurrentSimulationClient
  resumeRequestId?: string
  onRequestIdChange?: (requestId: string) => void
  onResult?: (result: ReturnCurrentSimulationDialogResult) => void
}

type Identity = {
  circuitJson: AnyCircuitElement[]
  client?: ReturnCurrentSimulationClient
  returnedInputs: WeakSet<AnyCircuitElement[]>
}
type Session = {
  identity: Identity
  open: boolean
  pcbTraceId?: string
  resumeRequestId?: string
  status: ReturnCurrentSimulationJob["status"] | "idle"
  result?: ReturnCurrentSimulationDialogResult
}

/** Only launch/display state lives here. Configuration and job work stay in the dialog. */
export const useReturnCurrentSimulationDialog = ({
  circuitJson,
  options,
  onSimulateReturnCurrent,
}: {
  circuitJson: AnyCircuitElement[]
  options?: ReturnCurrentSimulationDialogOptions
  onSimulateReturnCurrent?: (event: SimulateReturnCurrentEvent) => void
}) => {
  const inputIdentity = useMemo(
    () => ({
      circuitJson,
      client: options?.client,
      returnedInputs: new WeakSet<AnyCircuitElement[]>(),
    }),
    [circuitJson, options?.client],
  )
  const [session, setSession] = useState<Session>(() => ({
    identity: inputIdentity,
    open: Boolean(options?.resumeRequestId),
    resumeRequestId: options?.resumeRequestId,
    status: "idle",
  }))
  // A host may persist the exact returned Circuit JSON back into its viewer.
  // That adopts our own result; it is not a replacement PCB or a new dialog.
  const identity =
    session.identity.client === options?.client &&
    (session.identity.circuitJson === circuitJson ||
      session.identity.returnedInputs.has(circuitJson))
      ? session.identity
      : inputIdentity
  const optionsRef = useRef(options)
  optionsRef.current = options
  const identityRef = useRef(identity)
  identityRef.current = identity
  const launcher = useRef<HTMLButtonElement>(null)
  const current = session.identity === identity

  // An edited/replaced board must never keep a result or completion from an old board.
  useEffect(() => {
    setSession((previous) =>
      previous.identity === identity
        ? previous
        : { identity, open: false, status: "idle" },
    )
  }, [identity])

  const handleRequest = useCallback(
    ({ pcbTraceId }: SimulateReturnCurrentEvent) => {
      setSession((previous) => {
        if (previous.identity !== identity)
          return { identity, open: true, pcbTraceId, status: "idle" }
        if (previous.status === "queued" || previous.status === "running")
          return { ...previous, open: true }
        return {
          ...previous,
          open: true,
          pcbTraceId,
          ...(previous.pcbTraceId !== pcbTraceId
            ? { result: undefined, resumeRequestId: undefined }
            : {}),
        }
      })
    },
    [identity],
  )
  const close = useCallback(() => {
    setSession((previous) => ({ ...previous, open: false }))
    requestAnimationFrame(() => launcher.current?.focus())
  }, [])
  const onResult = useCallback(
    (result: ReturnCurrentSimulationDialogResult) => {
      if (identityRef.current !== identity) return
      identity.returnedInputs.add(result.circuitJson)
      setSession((previous) =>
        previous.identity === identity
          ? { ...previous, result, pcbTraceId: result.pcbTraceId }
          : previous,
      )
      optionsRef.current?.onResult?.(result)
    },
    [identity],
  )
  const onStatusChange = useCallback(
    (status: Session["status"]) => {
      setSession((previous) =>
        previous.identity === identity && previous.status !== status
          ? {
              ...previous,
              status,
              ...(status === "queued" || status === "running"
                ? { result: undefined }
                : {}),
            }
          : previous,
      )
    },
    [identity],
  )
  const onRequestIdChange = useCallback(
    (requestId: string) => {
      if (identityRef.current === identity)
        optionsRef.current?.onRequestIdChange?.(requestId)
    },
    [identity],
  )
  const result = current ? session.result : undefined
  const overlay: ReturnCurrentSimulationOptions | undefined = result && {
    resultId: result.resultId,
    pcbTraceId: result.pcbTraceId,
    layer: result.layer,
    showHeatmap: result.showHeatmap,
    showVectors: result.showVectors,
    opacity: result.opacity,
  }

  return {
    isOpen: Boolean(options && current && session.open),
    onSimulateReturnCurrent: options ? handleRequest : onSimulateReturnCurrent,
    overlay,
    circuitJson: result?.circuitJson,
    dialog:
      options && current ? (
        <ReturnCurrentSimulationDialog
          open={session.open}
          pcbTraceId={session.pcbTraceId}
          circuitJson={identity.circuitJson}
          client={options.client}
          resumeRequestId={session.resumeRequestId}
          onClose={close}
          onResult={onResult}
          onStatusChange={onStatusChange}
          onRequestIdChange={onRequestIdChange}
        />
      ) : null,
    launcher:
      options && current && (session.pcbTraceId || session.resumeRequestId) ? (
        <div
          data-toolbar-overlay
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: zIndexMap.toolbarOverlay,
          }}
        >
          <button
            ref={launcher}
            type="button"
            aria-label="Return current simulation"
            data-return-current-launcher
            onClick={() =>
              setSession((previous) => ({ ...previous, open: true }))
            }
            style={{
              color: "#e8f0f2",
              background: "#142b33",
              border: "1px solid #48616b",
              borderRadius: 5,
              padding: "7px 10px",
              cursor: "pointer",
              font: "12px/1.4 sans-serif",
            }}
          >
            Return current simulation
            {session.status === "queued" || session.status === "running"
              ? " · Running…"
              : result
                ? ` · ${result.frequencyHz / 1e6} MHz`
                : ""}
          </button>
        </div>
      ) : null,
  }
}
