import { css } from "@emotion/css"

export const HotkeyActionMenu = ({
  hotkeys,
}: {
  hotkeys: Array<{
    key: string
    name: string
  }>
}) => {
  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        font-family: sans-serif;
        font-size: 12px;
        margin: 8px;
      `}
    >
      {hotkeys.map((hotkey) => {
        return (
          <div
            key={hotkey.name}
            className={css`
              display: flex;
              align-items: center;
              margin: 2px;

              & .key {
                padding: 1px;
                margin: 2px;
                color: rgba(255, 255, 255, 0.8);
                font-size: 9px;
                border-radius: 3px;
                text-align: center;
                width: 20px;
                background-color: #444;
              }

              & .name {
                margin-left: 4px;
                color: rgba(255, 255, 255, 0.8);
              }
            `}
            key={hotkey.key}
          >
            <div className="key">{hotkey.key}</div>{" "}
            <div className="name">{hotkey.name}</div>
          </div>
        )
      })}
    </div>
  )
}
