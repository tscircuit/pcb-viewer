export interface Point {
    x: number;
    y: number;
    trace_width?: number;
  }

export function getExpandedStroke(
    strokeInput: (Point | [number, number] | number[])[],
    defaultWidth: number
  ): Point[] {
    if (strokeInput.length < 2) {
      throw new Error("Stroke must have at least two points");
    }
    
    const stroke: Point[] = strokeInput.map(point => {
      if (Array.isArray(point)) {
        return { x: point[0], y: point[1] };
      }
      return point as Point;
    });
  
    const leftSide: Point[] = [];
    const rightSide: Point[] = [];
  
    function getNormal(p1: Point, p2: Point): Point {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      return { x: -dy / length, y: dx / length };
    }
  
    function addPoint(point: Point, normal: Point, factor: number, width: number) {
      const halfWidth = width / 2;
      const newPoint = {
        x: point.x + normal.x * halfWidth * factor,
        y: point.y + normal.y * halfWidth * factor,
      };
      if (factor > 0) {
        leftSide.push(newPoint);
      } else {
        rightSide.unshift(newPoint);
      }
    }
  
    // Handle the first point
    const firstNormal = getNormal(stroke[0]!, stroke[1]!);
    const firstWidth = stroke[0]!.trace_width ?? defaultWidth;
    addPoint(stroke[0]!, firstNormal, 1, firstWidth);
    addPoint(stroke[0]!, firstNormal, -1, firstWidth);
  
    // Handle middle points
    for (let i = 1; i < stroke.length - 1; i++) {
      const prev = stroke[i - 1]!;
      const current = stroke[i]!;
      const next = stroke[i + 1]!;
  
      const normalPrev = getNormal(prev, current);
      const normalNext = getNormal(current, next);
  
      // Calculate miter line
      const miterX = normalPrev.x + normalNext.x;
      const miterY = normalPrev.y + normalNext.y;
      const miterLength = Math.sqrt(miterX * miterX + miterY * miterY);
  
      const currentWidth = current.trace_width ?? defaultWidth;
  
      // Check if miter is too long (sharp corner)
      const miterLimit = 2; // Adjust this value to control when to bevel
      if (miterLength / 2 > miterLimit * (currentWidth / 2)) {
        // Use bevel join
        addPoint(current, normalPrev, 1, currentWidth);
        addPoint(current, normalNext, 1, currentWidth);
        addPoint(current, normalPrev, -1, currentWidth);
        addPoint(current, normalNext, -1, currentWidth);
      } else {
        // Use miter join
        const scale = 1 / miterLength;
        addPoint(current, { x: miterX * scale, y: miterY * scale }, 1, currentWidth);
        addPoint(current, { x: miterX * scale, y: miterY * scale }, -1, currentWidth);
      }
    }
  
    // Handle the last point
    const lastNormal = getNormal(
      stroke[stroke.length - 2]!,
      stroke[stroke.length - 1]!
    );
    const lastWidth = stroke[stroke.length - 1]!.trace_width ?? defaultWidth;
    addPoint(stroke[stroke.length - 1]!, lastNormal, 1, lastWidth);
    addPoint(stroke[stroke.length - 1]!, lastNormal, -1, lastWidth);
  
    // Combine left and right sides to form a closed polygon
    return [...leftSide, ...rightSide];
  }