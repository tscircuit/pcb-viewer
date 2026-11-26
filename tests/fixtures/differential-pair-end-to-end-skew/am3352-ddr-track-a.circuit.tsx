import { cloneElement, type ReactElement, type ReactNode } from "react"

// Pass the default board element from
// 0hmX/am3352-ddr-track-a-local-dfm-wip-20261007 v0.0.17 to render the
// saved routes with these differential pair declarations.
export default function Am3352DdrTrackA({
  board,
}: { board: ReactElement<{ children?: ReactNode }> }) {
  return cloneElement(
    board,
    {},
    <>
      {board.props.children}
      <differentialpair
        name="DDR_DQS_PAIR0"
        positiveConnection="DDR_DQS0"
        negativeConnection="DDR_DQSn0"
      />
      <differentialpair
        name="DDR_DQS_PAIR1"
        positiveConnection="DDR_DQS1"
        negativeConnection="DDR_DQSn1"
      />
      <differentialpair
        name="DDR_CK_PAIR"
        positiveConnection="DDR_CK"
        negativeConnection="DDR_CKn"
      />
    </>,
  )
}
