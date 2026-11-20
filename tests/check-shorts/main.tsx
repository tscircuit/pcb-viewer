import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import { scene } from "../x-ray-net/scene"

createRoot(document.getElementById("root")!).render(
  <PCBViewer circuitJson={scene} renderer="canvas" height={600} />,
)
