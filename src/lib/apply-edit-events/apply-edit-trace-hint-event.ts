import { AnySoupElement } from "@tscircuit/soup"
import { EditTraceHintEvent } from "lib/edit-events"
import { su } from "@tscircuit/soup-util"

export const applyTraceHintEditEvent = (
  soup: AnySoupElement[],
  edit_event: EditTraceHintEvent,
): AnySoupElement[] => {
  const existing_trace_hint = soup.find(
    (th) =>
      th.type === "pcb_trace_hint" &&
      th.pcb_trace_hint_id === edit_event.pcb_trace_hint_id,
  )

  if (existing_trace_hint) {
    soup = soup.map((e: any) =>
      e.pcb_trace_hint_id === edit_event.pcb_trace_hint_id
        ? {
            ...e,
            route: edit_event.route,
          }
        : e,
    )
  } else {
    // create the trace hint
    const pcb_port = su(soup).pcb_port.get(edit_event.pcb_port_id!)

    // console.log("edit_event", edit_event, pcb_port)

    soup = soup
      // TODO until builder supports multiple trace hints, replace any
      // old trace hints on this same port
      .filter(
        (e) =>
          !(
            e.type === "pcb_trace_hint" &&
            e.pcb_port_id === edit_event.pcb_port_id
          ),
      )
      .concat([
        {
          type: "pcb_trace_hint",
          pcb_trace_hint_id: edit_event.pcb_trace_hint_id!,
          route: edit_event.route,
          pcb_port_id: edit_event.pcb_port_id!,
          pcb_component_id: pcb_port?.pcb_component_id!,
        },
      ])
  }

  return soup
}
