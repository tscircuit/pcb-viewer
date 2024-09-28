import { AnyCircuitElement } from "circuit-json"

export function getNetListMap(soup: AnyCircuitElement[]): {
  soup_id_to_net_id_map: Record<string, string>
  net_id_to_soup_id_map: Record<string, string[]>
} {
  const soup_id_to_net_id_map: Record<string, string> = {}
  const net_id_to_soup_id_map: Record<string, string[]> = {}

  // TODO implementation

  return {
    soup_id_to_net_id_map,
    net_id_to_soup_id_map,
  }
}
