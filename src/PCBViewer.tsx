import { useEffect, useState } from "react"
import { CanvasPrimitiveRenderer } from "./components/CanvasPrimitiveRenderer"
import { createRoot } from "@tscircuit/react-fiber"
import { createProjectBuilder } from "@tscircuit/builder"

export const PCBViewer = ({ children }) => {
  const [elements, setElements] = useState([])

  useEffect(() => {
    // TODO re-use project builder
    const projectBuilder = createProjectBuilder()
    createRoot()
      .render(children, projectBuilder as any)
      .then((elements) => setElements(elements))
  }, [children])

  if (elements.length === 0) return null

  return (
    <CanvasPrimitiveRenderer
      primitives={elements.flatMap((elm) => elm.pcb_primitives)}
    />
  )
}
