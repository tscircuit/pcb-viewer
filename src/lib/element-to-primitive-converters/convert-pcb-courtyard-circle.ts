import type { PcbCourtyardCircle } from "circuit-json"
import type { Primitive } from "../types"
import { getNewPcbDrawingObjectId } from "../convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertPcbCourtyardCircle = (
  element: PcbCourtyardCircle,
  metadata: MetaData,
): Primitive => {
  return {
    _pcb_drawing_object_id: getNewPcbDrawingObjectId("circle"),
    pcb_drawing_type: "circle",
    x: element.center.x,
    y: element.center.y,
    r: element.radius,
    layer: element.layer,
    _element: element,
    is_filled: false,
    _parent_pcb_component: metadata._parent_pcb_component,
    _parent_source_component: metadata._parent_source_component,
    _source_port: metadata._source_port,
  }
}
