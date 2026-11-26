import type { AnyCircuitElement } from "circuit-json"
import { useId, useMemo, useState } from "react"
import { getDifferentialPairLengthSkews } from "../lib/get-differential-pair-length-skew"

const formatMm = (value: number | null) =>
  value === null ? "Unavailable" : `${Number(value.toFixed(6))} mm`

export const DifferentialPairLengthSkewPanel = ({
  elements,
  initialPairId,
  onClose,
}: {
  elements: AnyCircuitElement[]
  initialPairId?: string
  onClose: () => void
}) => {
  const pairs = useMemo(
    () => getDifferentialPairLengthSkews(elements),
    [elements],
  )
  const [selectedPairId, setSelectedPairId] = useState(initialPairId)
  const pair =
    pairs.find((row) => row.sourceBusId === selectedPairId) ?? pairs[0]
  const headingId = useId()
  if (!pair) return null

  return (
    <section
      aria-labelledby={headingId}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        width: 300,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        background: "#1f1f1f",
        color: "#eee",
        border: "1px solid #666",
        borderRadius: 4,
        padding: 12,
        cursor: "default",
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong id={headingId}>End-to-end length skew</strong>
        <button
          type="button"
          aria-label="Close pair length skew"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
        Differential pair
        <select
          value={pair.sourceBusId}
          onChange={(event) => setSelectedPairId(event.target.value)}
        >
          {pairs.map((row) => (
            <option key={row.sourceBusId} value={row.sourceBusId}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "6px 12px",
          marginBottom: 0,
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
      <p style={{ margin: "8px 0 0", color: "#bbb" }}>
        Between declared endpoints. Via travel is estimated if the board has no
        detailed stackup.
      </p>
    </section>
  )
}
