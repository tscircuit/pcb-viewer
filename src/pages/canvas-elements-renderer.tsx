import { CanvasElementsRenderer } from "../components/CanvasElementsRenderer"
import { compose, scale, translate } from "transformation-matrix"
import { useMouseMatrixTransform } from "use-mouse-matrix-transform"

const defaultTransform = compose(translate(100, 100), scale(40, 40))

export default () => {
  const { ref: transformRef, transform } = useMouseMatrixTransform({
    initialTransform: defaultTransform,
  })

  return (
    <div ref={transformRef}>
      <CanvasElementsRenderer
        elements={
          [
            {
              type: "pcb_component",
              source_component_id: "generic_0",
              pcb_component_id: "pcb_generic_component_0",
              source: {
                type: "source_component",
                source_component_id: "generic_0",
                name: "C1",
              },
            },
            {
              type: "pcb_smtpad",
              shape: "rect",
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              pcb_component_id: "pcb_generic_component_0",
              source: null,
            },
            {
              type: "pcb_smtpad",
              shape: "rect",
              x: 2,
              y: 0,
              width: 1,
              height: 1,
              pcb_component_id: "pcb_generic_component_0",
              source: null,
            },
          ] as any
        }
        height={300}
        width={500}
        transform={transform}
        grid={{
          spacing: 1,
          view_window: {
            left: 0,
            right: 500,
            top: 300,
            bottom: 0,
          },
        }}
      />
    </div>
  )
}
