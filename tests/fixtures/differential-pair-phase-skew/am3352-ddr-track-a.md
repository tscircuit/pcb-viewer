# AM3352 DDR Track A phase skew

The fixture uses v0.0.17 of the [AM3352 DDR Track A package](https://tscircuit.com/0hmX/am3352-ddr-track-a-local-dfm-wip-20261007).

Clone the board source with `tsci clone 0hmX/am3352-ddr-track-a-local-dfm-wip-20261007`.
In a separate render environment with `tscircuit@0.0.3294` (Core `0.0.2480`),
load the default board from `index.tsx`. Append these `<differentialpair>`
declarations to the board's children using the existing trace names.

| Pair name | Positive connection | Negative connection |
| --- | --- | --- |
| `DDR_DQS_PAIR0` | `DDR_DQS0` | `DDR_DQSn0` |
| `DDR_DQS_PAIR1` | `DDR_DQS1` | `DDR_DQSn1` |
| `DDR_CK_PAIR` | `DDR_CK` | `DDR_CKn` |

Add the board to a `RootCircuit`, await `renderUntilSettled()`, and serialize
`getCircuitJson()` with `JSON.stringify` and a trailing newline. The board
uses its saved routes and the fixture includes the full output.
