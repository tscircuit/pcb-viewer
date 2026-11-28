import { type ReactElement, type ReactNode, cloneElement } from "react"

export function withDdrPhaseSkew(
  board: ReactElement<{ children?: ReactNode }>,
) {
  return cloneElement(
    board,
    undefined,
    board.props.children,
    <differentialpair
      name="DDR_DQS_PAIR0"
      positiveConnection="DDR_DQS0"
      negativeConnection="DDR_DQSn0"
    />,
    <differentialpair
      name="DDR_DQS_PAIR1"
      positiveConnection="DDR_DQS1"
      negativeConnection="DDR_DQSn1"
    />,
    <differentialpair
      name="DDR_CK_PAIR"
      positiveConnection="DDR_CK"
      negativeConnection="DDR_CKn"
    />,
  )
}
