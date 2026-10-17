import type { Layer } from "./schema";

export type LayerBounds = { x: number; y: number; w: number; h: number };

export const MIN_LAYER_SIZE = 0.005;

export function moveLayerBy(layer: Layer, dx: number, dy: number): Layer {
  switch (layer.kind) {
    case "text":
    case "redact":
      return { ...layer, x: layer.x + dx, y: layer.y + dy };
    case "annotation": {
      const shape = layer.shape;
      switch (shape.type) {
        case "arrow":
          return {
            ...layer,
            shape: {
              ...shape,
              from: { x: shape.from.x + dx, y: shape.from.y + dy },
              to: { x: shape.to.x + dx, y: shape.to.y + dy },
            },
          };
        case "rect":
        case "ellipse":
        case "highlight":
          return {
            ...layer,
            shape: { ...shape, x: shape.x + dx, y: shape.y + dy },
          };
        case "step":
        case "emoji":
          return {
            ...layer,
            shape: { ...shape, x: shape.x + dx, y: shape.y + dy },
          };
      }
    }
  }
}

export function duplicateLayer(layer: Layer, dx: number, dy: number): Layer {
  const moved = moveLayerBy(layer, dx, dy);
  return {
    ...moved,
    id: crypto.randomUUID(),
    name: layer.name ? `${layer.name} copy` : undefined,
  };
}

/** Bounds in the layer's own space (canvas space for text is handled by the overlay). */
export function getLayerBounds(layer: Layer): LayerBounds | null {
  if (layer.kind === "text") return null;
  if (layer.kind === "redact") {
    return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
  }

  const shape = layer.shape;
  switch (shape.type) {
    case "rect":
    case "ellipse":
    case "highlight":
      return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case "step":
    case "emoji":
      return {
        x: shape.x - shape.size / 2,
        y: shape.y - shape.size / 2,
        w: shape.size,
        h: shape.size,
      };
    case "arrow":
      return {
        x: Math.min(shape.from.x, shape.to.x),
        y: Math.min(shape.from.y, shape.to.y),
        w: Math.abs(shape.to.x - shape.from.x),
        h: Math.abs(shape.to.y - shape.from.y),
      };
  }
}

export function withLayerBounds(
  layer: Layer,
  bounds: LayerBounds,
): Layer | null {
  if (layer.kind === "text") return null;
  const w = Math.max(MIN_LAYER_SIZE, bounds.w);
  const h = Math.max(MIN_LAYER_SIZE, bounds.h);

  if (layer.kind === "redact") {
    return { ...layer, x: bounds.x, y: bounds.y, w, h };
  }

  const shape = layer.shape;
  switch (shape.type) {
    case "rect":
    case "ellipse":
    case "highlight":
      return {
        ...layer,
        shape: { ...shape, x: bounds.x, y: bounds.y, w, h },
      };
    case "step":
    case "emoji":
      return {
        ...layer,
        shape: {
          ...shape,
          x: bounds.x + w / 2,
          y: bounds.y + h / 2,
          size: Math.max(w, h),
        },
      };
    case "arrow":
      return null;
  }
}

export function layerKindLabel(layer: Layer): string {
  if (layer.kind === "text") return "Text";
  if (layer.kind === "redact") return "Redact";
  switch (layer.shape.type) {
    case "arrow":
      return "Arrow";
    case "rect":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "highlight":
      return "Highlight";
    case "step":
      return "Step";
    case "emoji":
      return "Emoji";
  }
}
