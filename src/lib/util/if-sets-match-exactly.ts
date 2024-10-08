export function ifSetsMatchExactly(set1: Set<any>, set2: Set<any>) {
  if (set1.size !== set2.size) return false
  return Array.from(set1).every((item) => set2.has(item))
}
