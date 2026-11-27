import {
  BUMP_DEPTH_PX,
  DIAGONAL,
  LOAD_X,
  NEGATIVE_PAD_Y,
  POSITIVE_PAD_Y,
  SOURCE_X,
} from "./constants"
import { relativePath } from "./relative-path"
import { tuningBump } from "./tuning-bump"

const FANOUT_CENTER_Y = (POSITIVE_PAD_Y + NEGATIVE_PAD_Y) / 2
const POSITIVE_FANOUT_Y = FANOUT_CENTER_Y - 10.5
const NEGATIVE_FANOUT_Y = FANOUT_CENTER_Y + 10.5
const FANOUT_RUN = POSITIVE_FANOUT_Y - POSITIVE_PAD_Y
const POSITIVE_RISE_X = 363.5
const NEGATIVE_RISE_X = 373.1
const POSITIVE_TOP_Y = 225
const NEGATIVE_TOP_Y = 246
const POSITIVE_FALL_X = 857
const NEGATIVE_FALL_X = 848

export const POSITIVE_PATH = relativePath({
  sourceCenterY: FANOUT_CENTER_Y,
  vertices: [
    [SOURCE_X, POSITIVE_PAD_Y],
    [227, POSITIVE_PAD_Y],
    [227 + FANOUT_RUN, POSITIVE_FANOUT_Y],
    [POSITIVE_RISE_X, POSITIVE_FANOUT_Y],
    ...tuningBump({
      x: 423.5,
      y: POSITIVE_FANOUT_Y - (423.5 - POSITIVE_RISE_X),
      dx: DIAGONAL,
      dy: -DIAGONAL,
    }),
    [POSITIVE_RISE_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_TOP_Y],
    ...tuningBump({ x: 577, y: POSITIVE_TOP_Y, dx: 1, dy: 0 }),
    [POSITIVE_FALL_X, POSITIVE_TOP_Y],
    ...tuningBump({
      x: 909.5,
      y: POSITIVE_TOP_Y + (909.5 - POSITIVE_FALL_X),
      dx: DIAGONAL,
      dy: DIAGONAL,
    }),
    [POSITIVE_FALL_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_FANOUT_Y],
    [1055 - FANOUT_RUN, POSITIVE_FANOUT_Y],
    [1055, POSITIVE_PAD_Y],
    [LOAD_X, POSITIVE_PAD_Y],
  ],
})

export const NEGATIVE_PATH = relativePath({
  sourceCenterY: FANOUT_CENTER_Y,
  vertices: [
    [SOURCE_X, NEGATIVE_PAD_Y],
    [227, NEGATIVE_PAD_Y],
    [227 + FANOUT_RUN, NEGATIVE_FANOUT_Y],
    [NEGATIVE_RISE_X, NEGATIVE_FANOUT_Y],
    [NEGATIVE_RISE_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_TOP_Y],
    ...[666, 722.4, 778.8].flatMap((x) =>
      tuningBump({ x, y: NEGATIVE_TOP_Y, dx: 1, dy: 0, depth: -BUMP_DEPTH_PX }),
    ),
    [NEGATIVE_FALL_X, NEGATIVE_TOP_Y],
    [NEGATIVE_FALL_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_FANOUT_Y],
    [1055 - FANOUT_RUN, NEGATIVE_FANOUT_Y],
    [1055, NEGATIVE_PAD_Y],
    [LOAD_X, NEGATIVE_PAD_Y],
  ],
})
