import React, { useEffect, useRef } from "react"
import { PCBViewer } from "../PCBViewer"

// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       custom: {
//         onRender: (gb: GroupBuilder) => any
//       }
//     }
//   }
// }

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <custom
          onRender={(gb: any) => {
            // gb.addResistor((rb) => {})
            gb.addComponent((cb: any) => {
              cb.footprint.addPad((pb: any) =>
                pb
                  .setShape("rect")
                  .setLayer("top")
                  .setPosition(100, 100)
                  .setSize(20, 20),
              )
              cb.footprint.addPad((pb: any) =>
                pb
                  .setShape("rect")
                  .setLayer("top")
                  .setPosition(140, 100)
                  .setSize(20, 20),
              )
            })
          }}
        />
      </PCBViewer>
    </div>
  )
}
