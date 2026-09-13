export const NET_PALETTE = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4'];

export function getDeterministicNetColor(netName: string): string {
  let hash = 0;
  for (let i = 0; i < netName.length; i++) {
    hash = (hash << 5) - hash + netName.charCodeAt(i);
    hash |= 0;
  }
  return NET_PALETTE[Math.abs(hash) % NET_PALETTE.length];
}
