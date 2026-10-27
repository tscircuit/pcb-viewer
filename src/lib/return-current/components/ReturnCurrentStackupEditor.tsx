import { jlcpcbFourLayerStackup, returnCurrentStackupSchema } from "../stackup"

export function ReturnCurrentStackupEditor({
  value,
  onChange,
  controlClassName,
  buttonClassName,
}: {
  value: string
  onChange: (value: string) => void
  controlClassName: string
  buttonClassName: string
}) {
  let thickness: number | undefined
  try {
    thickness = returnCurrentStackupSchema
      .parse(JSON.parse(value))
      .layers.reduce(
        (sum, layer) =>
          sum +
          ("name" in layer
            ? layer.copperThicknessMm
            : "dielectricThicknessMm" in layer
              ? layer.dielectricThicknessMm
              : 0),
        0,
      )
  } catch {
    /* Submission displays the validation error. */
  }
  return (
    <section className="rc-dialog-section rctw-mt-6 rctw-border-t rctw-pt-5">
      <h3>Four-layer fabrication stackup</h3>
      <p>
        Use the manufacturer's stackup when available. The JLCPCB preset is an
        assumption for a 1.2 mm board, not a measurement of this PCB.
      </p>
      <button
        type="button"
        className={buttonClassName}
        onClick={() =>
          onChange(JSON.stringify(jlcpcbFourLayerStackup(), null, 2))
        }
      >
        Use JLCPCB JLC04121H-7628 (assumed)
      </button>
      <p>
        <a href="https://jlcpcb.com/impedance" target="_blank" rel="noreferrer">
          JLCPCB published stackup
        </a>
        : 35 / 15.2 / 15.2 / 35 µm copper; 0.2104 / 0.6 / 0.2104 mm dielectrics;
        εr 4.4 / 4.6 / 4.4. Loss tangent 0.02 is assumed.
      </p>
      <label className="rc-dialog-label">
        Stackup dimensions and materials (JSON, mm)
        <textarea
          className={controlClassName}
          rows={12}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          spellCheck={false}
        />
      </label>
      {thickness !== undefined && (
        <p>
          Physical stack thickness: {Number(thickness.toFixed(6))} mm. Explicit
          dimensions are used without scaling to the nominal board thickness.
        </p>
      )}
    </section>
  )
}
