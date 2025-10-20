const convertDistanceUnit = (value: number, unit?: string) => {
  if (!unit || unit === "mm") return value

  const normalizedUnit = unit.toLowerCase()

  switch (normalizedUnit) {
    case "mil":
      return value * 0.0254
    case "in":
    case "inch":
    case "\"":
      return value * 25.4
    case "cm":
      return value * 10
    case "m":
      return value * 1000
    case "um":
    case "micrometer":
    case "micron":
      return value / 1000
    case "nm":
      return value / 1_000_000
    case "ft":
    case "foot":
    case "feet":
      return value * 304.8
    default:
      return value
  }
}

const parseDistanceValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return 0

    const match = trimmed.match(
      /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\s*([a-zA-Z\"']+))?$/,
    )

    if (!match) {
      const parsed = Number.parseFloat(trimmed)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const magnitude = Number.parseFloat(match[1]!)
    const unit = match[2]?.toLowerCase()
    return convertDistanceUnit(magnitude, unit)
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>

    if (typeof record.mm === "number" && Number.isFinite(record.mm)) {
      return record.mm
    }

    if (typeof record.value === "number") {
      const unit = typeof record.unit === "string" ? record.unit : undefined
      return convertDistanceUnit(record.value, unit)
    }

    for (const [unitKey, numericValue] of Object.entries(record)) {
      if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
        return convertDistanceUnit(numericValue, unitKey)
      }
    }
  }

  const fallback = Number(value)
  return Number.isFinite(fallback) ? fallback : 0
}

export type ParsedDistance = {
  mm: number
}

export const distance = {
  parse(value: unknown): ParsedDistance {
    return { mm: parseDistanceValue(value) }
  },
}

export type Distance = typeof distance
