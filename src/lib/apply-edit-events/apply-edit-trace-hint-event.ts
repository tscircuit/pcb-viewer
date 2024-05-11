import { AnySoupElement } from "@tscircuit/soup"
import { EditTraceHintEvent } from "lib/edit-events"

export const applyTraceHintEditEvent = (
  soup: AnySoupElement[],
  edit_event: EditTraceHintEvent
): AnySoupElement[] => {
  const existing_trace_hint = soup.find(
    (th) =>
      th.type === "pcb_trace_hint" &&
      th.pcb_trace_hint_id === edit_event.pcb_trace_hint_id
  )
  console.log("apply trace hint called", existing_trace_hint)

  if (existing_trace_hint) {
    soup = soup.map((e: any) =>
      e.pcb_trace_hint_id === edit_event.pcb_trace_hint_id
        ? {
            ...e,
            route: edit_event.route,
          }
        : e
    )
  } else {
    // create the trace hint
    console.log("creating trace hint")
    soup = soup.concat([
      {
        type: "pcb_trace_hint",
        pcb_trace_hint_id: edit_event.pcb_trace_hint_id!,
        route: edit_event.route,
        pcb_port_id: edit_event.pcb_port_id!,
        pcb_component_id: "",
      },
    ])
  }

  return soup
}
