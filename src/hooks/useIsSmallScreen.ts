import { useEffect, useState } from "react"

export const useIsSmallScreen = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsSmallScreen(window.innerWidth <= 768)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return isSmallScreen
}
