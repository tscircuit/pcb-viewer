import type { AnySoupElement, PCBComponent } from "@tscircuit/builder"
import { useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"

interface Props {
  transform?: Matrix
  children: any
  soup: AnySoupElement[]
  cancelDrag?: Function
}

const isInsideOf = (
  pcb_component: PCBComponent,
  point: { x: number; y: number },
  padding: number = 0
) => {
  const halfWidth = pcb_component.width / 2
  const halfHeight = pcb_component.height / 2

  const left = pcb_component.center.x - halfWidth - padding
  const right = pcb_component.center.x + halfWidth + padding
  const top = pcb_component.center.y - halfHeight - padding
  const bottom = pcb_component.center.y + halfHeight + padding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
}

export const EditOverlay = ({
  children,
  transform,
  soup,
  cancelDrag,
}: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activePcbComponentId, setActivePcbComponent] = useState<null | string>(
    null
  )
  const isPcbComponentActive = activePcbComponentId !== null

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const rwPoint = applyToPoint(inverse(transform!), { x, y })

        let foundActiveComponent = false
        for (const e of soup) {
          if (
            e.type === "pcb_component" &&
            isInsideOf(e, rwPoint, 10 / transform.a)
          ) {
            cancelDrag?.()
            setActivePcbComponent(e.pcb_component_id)
            foundActiveComponent = true
            break
          }
        }
        if (!foundActiveComponent) {
          setActivePcbComponent(null)
        }

        if (foundActiveComponent) {
          e.preventDefault()
          return false
        }
      }}
    >
      {children}
      {soup
        .filter((e): e is PCBComponent => e.type === "pcb_component")
        .map((e) => {
          const projectedCenter = applyToPoint(transform, e.center)

          return (
            <div
              key={e.pcb_component_id}
              style={{
                position: "absolute",
                pointerEvents: "none",
                // b/c of transform, this is actually center not left/top
                left: projectedCenter.x,
                top: projectedCenter.y,
                width: e.width * transform.a + 20,
                height: e.height * transform.a + 20,
                transform: "translate(-50%, -50%)",
                background:
                  isPcbComponentActive &&
                  activePcbComponentId === e.pcb_component_id
                    ? "rgba(255, 0, 0, 0.5)"
                    : "rgba(255, 255, 0, 0.5)",
                border: "1px solid red",
              }}
            />
          )
        })}
      <div
        style={{ position: "absolute", right: 0, bottom: 0, color: "white" }}
      >
        Hello world!
      </div>
    </div>
  )
}
