export function getLayerForShortcutKey(key: string): string | null {
  const map: Record<string, string> = { '1': 'top_copper', '2': 'bottom_copper', '3': 'top_silkscreen', '4': 'bottom_silkscreen' };
  return map[key] || null;
}
