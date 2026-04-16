import { getErrorId } from "lib/util/get-error-id"

export const groupErrorsByType = <
  T extends {
    error_type?: string
  },
>(
  errors: T[],
) => {
  const groups = new Map<
    string,
    { error: T; index: number; errorId: string }[]
  >()

  errors.forEach((error, index) => {
    const errorType = error.error_type || "unknown_error"
    const existingGroup = groups.get(errorType) || []

    existingGroup.push({
      error,
      index,
      errorId: getErrorId(error, index),
    })

    groups.set(errorType, existingGroup)
  })

  return Array.from(groups.entries()).map(([errorType, groupedErrors]) => ({
    errorType,
    errors: groupedErrors,
  }))
}
