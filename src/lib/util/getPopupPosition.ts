export const getPopupPosition = (
  errorCenter: { x: number; y: number },
  containerRef: React.RefObject<HTMLDivElement | null>,
) => {
  const container = containerRef.current
  if (!container)
    return {
      transform: "translate(-50%, -100%)",
      left: errorCenter.x,
      top: errorCenter.y,
    }

  const containerRect = container.getBoundingClientRect()
  const popupWidth = 200
  const popupHeight = 60
  const margin = 10

  let transformX = "-50%"
  let transformY = "-100%"
  let left = errorCenter.x
  let top = errorCenter.y

  if (errorCenter.x - popupWidth / 2 < margin) {
    transformX = "0%"
    left = margin
  }

  if (errorCenter.x + popupWidth / 2 > containerRect.width - margin) {
    transformX = "-100%"
    left = containerRect.width - margin
  }

  if (errorCenter.y - popupHeight < margin) {
    transformY = "20px"
  }

  return {
    transform: `translate(${transformX}, ${transformY})`,
    left,
    top,
  }
}
