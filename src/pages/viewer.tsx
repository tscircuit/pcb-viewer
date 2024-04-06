import { GroupBuilder } from "@tscircuit/builder"
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
          onRender={(gb) => {
            // gb.addResistor((rb) => {})
            gb.addComponent((cb) => {
              cb.footprint.addPad((pb) =>
                pb
                  .setShape("rect")
                  .setLayer("top")
                  .setPosition(100, 100)
                  .setSize(20, 20)
              )
              cb.footprint.addPad((pb) =>
                pb
                  .setShape("rect")
                  .setLayer("top")
                  .setPosition(140, 100)
                  .setSize(20, 20)
              )
            })
          }}
        />
      </PCBViewer>
    </div>
  )
}
