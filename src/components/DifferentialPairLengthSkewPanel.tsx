import type { AnyCircuitElement } from "circuit-json"
import { useId, useMemo } from "react"
import { getDifferentialPairLengthSkews } from "../lib/get-differential-pair-length-skew"
import { zIndexMap } from "../lib/util/z-index-map"

const formatMm = (value: number | null) =>
  value === null ? "Unavailable" : `${Number(value.toFixed(6))} mm`

export const DifferentialPairLengthSkewPanel = ({
  elements,
  pairSkewBusId,
  isSmallScreen,
}: {
  elements: AnyCircuitElement[]
  pairSkewBusId?: string
  isSmallScreen: boolean
}) => {
  const pairs = useMemo(
    () => getDifferentialPairLengthSkews(elements),
    [elements],
  )
  const visiblePairs = pairSkewBusId
    ? pairs.filter((pair) => pair.sourceBusId === pairSkewBusId)
    : pairs
  const headingId = useId()
  if (!visiblePairs.length) return null

  return (
    <section
      aria-labelledby={headingId}
      style={{
        position: "absolute",
        ...(isSmallScreen ? { bottom: 12, left: 12 } : { top: 16, right: 16 }),
        zIndex: zIndexMap.toolbarOverlay - 1,
        width: 230,
        maxWidth: "calc(100% - 24px)",
        maxHeight: "35%",
        overflow: "auto",
        boxSizing: "border-box",
        background: "#1f1f1f",
        color: "#eee",
        border: "1px solid #666",
        borderRadius: 4,
        padding: 9,
        font: "12px sans-serif",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <strong id={headingId}>End-to-end length skew</strong>
      {visiblePairs.map((pair) => (
        <div
          key={pair.sourceBusId}
          aria-label={pair.name}
          role="group"
          style={{ marginTop: 6 }}
        >
          <div style={{ color: "#bbb", overflowWrap: "anywhere" }}>
            {pair.name}
          </div>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "4px 8px",
              margin: "4px 0 0",
            }}
          >
            <dt>Length skew</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {formatMm(pair.lengthSkewMm)}
            </dd>
            <dt>P path</dt>
            <dd style={{ margin: 0 }}>{formatMm(pair.positiveLengthMm)}</dd>
            <dt>N path</dt>
            <dd style={{ margin: 0 }}>{formatMm(pair.negativeLengthMm)}</dd>
            {pair.toleranceMm !== null && (
              <>
                <dt>Limit</dt>
                <dd style={{ margin: 0 }}>
                  {formatMm(pair.toleranceMm)}
                  {pair.passesTolerance !== null &&
                    (pair.passesTolerance ? " · Pass" : " · Fail")}
                </dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </section>
  )
}
