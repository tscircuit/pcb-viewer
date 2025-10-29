import { useCallback } from "react"

export const STORAGE_KEYS = {
  IS_SHOWING_PCB_GROUPS: "pcb_viewer_is_showing_pcb_groups",
  PCB_GROUP_VIEW_MODE: "pcb_viewer_group_view_mode",
  IS_SHOWING_COPPER_POURS: "pcb_viewer_is_showing_copper_pours",
} as const

export const getStoredBoolean = (
  key: string,
  defaultValue: boolean,
): boolean => {
  if (typeof window === "undefined") return defaultValue
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

export const setStoredBoolean = (key: string, value: boolean): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const getStoredString = (key: string, defaultValue: string): string => {
  if (typeof window === "undefined") return defaultValue
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

export const setStoredString = (key: string, value: string): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const useLocalStorage = () => {
  const getBoolean = useCallback(
    (key: string, defaultValue: boolean): boolean => {
      return getStoredBoolean(key, defaultValue)
    },
    [],
  )

  const setBoolean = useCallback((key: string, value: boolean): void => {
    setStoredBoolean(key, value)
  }, [])

  return {
    getBoolean,
    setBoolean,
  }
}

export const useLocalStorageValue = (key: string, defaultValue: boolean) => {
  const { getBoolean, setBoolean } = useLocalStorage()

  const getValue = useCallback(() => {
    return getBoolean(key, defaultValue)
  }, [getBoolean, key, defaultValue])

  const setValue = useCallback(
    (value: boolean) => {
      setBoolean(key, value)
    },
    [setBoolean, key],
  )

  return {
    getValue,
    setValue,
  }
}
