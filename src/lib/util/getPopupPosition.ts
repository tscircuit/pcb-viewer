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
  const margin = 10
  const horizontalOffset = 60
  let transformX = "-50%"
  let transformY = "-100%"
  let left = errorCenter.x
  let top = errorCenter.y

  if (
    errorCenter.x + horizontalOffset + popupWidth <
    containerRect.width - margin
  ) {
    left = errorCenter.x + horizontalOffset
    transformX = "0%"
  } else if (errorCenter.x - horizontalOffset - popupWidth > margin) {
    left = errorCenter.x - horizontalOffset
    transformX = "-100%"
  } else {
    left = errorCenter.x
    transformX = "-50%"
  }

  return {
    transform: `translate(${transformX}, ${transformY})`,
    left,
    top,
  }
}
