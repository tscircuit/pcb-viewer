import type { AnyCircuitElement, LayerRef, PCBKeepout } from "circuit-json";
import { CircuitToCanvasDrawer } from "circuit-to-canvas";
import color from "color";
import type { Matrix } from "transformation-matrix";
import { LAYER_NAME_TO_COLOR } from "./Drawer";
import { getCopperRenderLayer } from "./copper-layers";

export function isPcbKeepout(
  element: AnyCircuitElement,
): element is PCBKeepout {
  return element.type === "pcb_keepout";
}

export function getPcbKeepoutElementsForLayer({
  elements,
  layer,
}: {
  elements: AnyCircuitElement[];
  layer: LayerRef;
}): PCBKeepout[] {
  return elements
    .filter(isPcbKeepout)
    .filter((keepout) => keepout.layers.includes(layer));
}

export function getPcbKeepoutColorForLayer(layer: LayerRef): string {
  return color(LAYER_NAME_TO_COLOR[layer]).lighten(0.4).hex();
}

export function drawPcbKeepoutElementsForLayer({
  canvas,
  elements,
  layer,
  realToCanvasMat,
}: {
  canvas: HTMLCanvasElement;
  elements: AnyCircuitElement[];
  layer: LayerRef;
  realToCanvasMat: Matrix;
}) {
  const keepoutElements = getPcbKeepoutElementsForLayer({ elements, layer });

  if (keepoutElements.length === 0) return;

  const drawer = new CircuitToCanvasDrawer(canvas);
  const keepoutColor = getPcbKeepoutColorForLayer(layer);
  drawer.configure({
    colorOverrides: {
      keepout: {
        top: keepoutColor,
        bottom: keepoutColor,
      },
    },
  });
  drawer.realToCanvasMat = realToCanvasMat;

  drawer.drawElements(keepoutElements, {
    layers: [getCopperRenderLayer(layer)],
  });
}
