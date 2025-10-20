import { useMemo, type CSSProperties } from "react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

const description = `
Reproduction fixture for a bug where hovering or zooming after interacting
with a rectangular SMT pad caused neighbouring polygon pads to expand and
prevented the polygon pad from being hover-highlighted.
`

const styles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  backgroundColor: "black",
  padding: 16,
}

export const PolygonSmtPadHoverBug = () => {
  const circuitJson = useMemo(() => {
    const circuit = new Circuit()

    circuit.add(
      <board width="10mm" height="10mm">
        <chip
          name="U1"
          footprint={
            <footprint>
              <smtpad
                portHints={["pin2"]}
                points={[
                  { x: "-0.22597110000015164mm", y: "-0.4744973999999047mm" },
                  { x: "-0.585965299999998mm", y: "-0.4744973999999047mm" },
                  { x: "-0.585965299999998mm", y: "-0.17447259999994458mm" },
                  { x: "-0.40595550000011826mm", y: "-0.17447259999994458mm" },
                  { x: "-0.22597110000015164mm", y: "-0.354482399999938mm" },
                ]}
                shape="polygon"
              />
              <smtpad
                portHints={["pin1"]}
                points={[
                  { x: "-0.2259202999999843mm", y: "0.47553880000009485mm" },
                  { x: "-0.5859145000001718mm", y: "0.47553880000009485mm" },
                  { x: "-0.5859145000001718mm", y: "0.17551400000002104mm" },
                  { x: "-0.4059047000000646mm", y: "0.17551400000002104mm" },
                  { x: "-0.2259202999999843mm", y: "0.3555237999999008mm" },
                ]}
                shape="polygon"
              />
              <smtpad
                portHints={["pin4"]}
                points={[
                  { x: "0.22597110000003795mm", y: "0.47454819999995834mm" },
                  { x: "0.585965299999998mm", y: "0.47454819999995834mm" },
                  { x: "0.585965299999998mm", y: "0.17452339999999822mm" },
                  { x: "0.4059555000000046mm", y: "0.17452339999999822mm" },
                  { x: "0.22597110000003795mm", y: "0.35453319999999167mm" },
                ]}
                shape="polygon"
              />
              <smtpad
                portHints={["pin3"]}
                points={[
                  { x: "0.22597110000003795mm", y: "-0.47553879999998117mm" },
                  { x: "0.585965299999998mm", y: "-0.47553879999998117mm" },
                  { x: "0.585965299999998mm", y: "-0.17551399999990736mm" },
                  { x: "0.4059555000000046mm", y: "-0.17551399999990736mm" },
                  { x: "0.22597110000003795mm", y: "-0.3555238000000145mm" },
                ]}
                shape="polygon"
              />
              <smtpad
                portHints={["pin5"]}
                pcbX="0.0020701000000826753mm"
                pcbY="0.0005587999999079329mm"
                width="0.48000919999999997mm"
                height="0.48000919999999997mm"
                shape="rect"
              />
              <silkscreenpath
                route={[
                  {
                    x: -0.5080127000001085,
                    y: 0.02136140000004616,
                  },
                  {
                    x: -0.5080127000001085,
                    y: -0.020320000000083382,
                  },
                ]}
              />
              <silkscreenpath
                route={[
                  {
                    x: 0.507987299999968,
                    y: 0.02037079999990965,
                  },
                  {
                    x: 0.507987299999968,
                    y: -0.02136140000004616,
                  },
                ]}
              />
              <silkscreenpath
                route={[
                  {
                    x: 0.07392670000001544,
                    y: 0.5000244000000293,
                  },
                  {
                    x: -0.07390130000010231,
                    y: 0.5000244000000293,
                  },
                ]}
              />
              <silkscreenpath
                route={[
                  {
                    x: 0.07379969999999503,
                    y: -0.4999735999999757,
                  },
                  {
                    x: -0.07402830000000904,
                    y: -0.4999735999999757,
                  },
                ]}
              />
            </footprint>
          }
        />
      </board>,
    )

    return circuit.getCircuitJson()
  }, [])

  return (
    <div style={styles}>
      <p style={{ color: "white", maxWidth: 400 }}>{description}</p>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default PolygonSmtPadHoverBug
