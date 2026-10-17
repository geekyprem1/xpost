"use client";

import { useState } from "react";
import {
  buildAnnotationLayer,
  type AnnotationToolId,
} from "@/lib/editor/annotation-tools";
import {
  cropAspectRatio,
  cropFromCorner,
  moveCrop,
  type CropCorner,
} from "@/lib/editor/crop";
import { buildRedactLayer } from "@/lib/editor/redact-tools";
import { fontStack } from "@/lib/fonts";
import {
  canvasToSourceUv,
  computeCardLayout,
  imageQuad,
  sourceUvToCanvasPoint,
  type Point as CanvasPoint,
  type Size,
} from "@/lib/renderer/geometry";
import {
  croppedImageSize,
  FULL_CROP,
  getImageCrop,
  getLayerBounds,
  moveLayerBy,
  withLayerBounds,
  type ImageCrop,
  type Layer,
  type LayerBounds,
  type Scene,
  type TextLayer,
} from "@/lib/scene";
import { useEditorStore, useUiStore } from "@/lib/store";

type Corner = "nw" | "ne" | "se" | "sw";

type TextBox = {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
};

type AnnotationDraft = {
  tool: AnnotationToolId | "redact";
  pointerId: number;
  startUv: CanvasPoint;
  currentUv: CanvasPoint;
};

type CropDrag = {
  pointerId: number;
  mode: "move" | "resize";
  corner?: CropCorner;
  startCrop: ImageCrop;
  startUv: CanvasPoint;
};

type Interaction =
  | {
      mode: "move";
      pointerId: number;
      layer: Layer;
      start: CanvasPoint;
      startUv: CanvasPoint | null;
    }
  | {
      mode: "resize-text";
      pointerId: number;
      layer: TextLayer;
      edge: "left" | "right";
    }
  | {
      mode: "resize-box";
      pointerId: number;
      layer: Layer;
      corner: Corner;
    };

function estimateTextLines(
  text: string,
  widthPx: number,
  fontPx: number,
): number {
  const charsPerLine = Math.max(1, widthPx / Math.max(1, fontPx * 0.55));
  return text.split("\n").reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
}

function textBox(
  layer: TextLayer,
  displayWidth: number,
  displayHeight: number,
  scale: number,
): TextBox {
  const padding = (layer.style.background?.padding ?? 0) * scale;
  const fontPx = layer.style.size * scale;
  const width = Math.max(1, layer.width * displayWidth);
  const lines = estimateTextLines(
    layer.text,
    Math.max(1, width - padding * 2),
    fontPx,
  );
  return {
    cx: layer.x * displayWidth,
    cy: layer.y * displayHeight,
    width,
    height: Math.max(1, lines * fontPx * layer.style.lineHeight + padding * 2),
    rotation: layer.rotation,
  };
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): CanvasPoint {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function layerImageQuad(
  layer: Layer,
  scene: Scene,
  layout: ReturnType<typeof computeCardLayout>,
  sourceSize: Size,
  scale: number,
): CanvasPoint[] | null {
  const bounds = getLayerBounds(layer);
  if (!bounds) return null;

  const pad =
    layer.kind === "annotation" ? Math.max(layer.stroke, 0.004) : 0.002;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = Math.max(bounds.w + pad * 2, pad * 2);
  const h = Math.max(bounds.h + pad * 2, pad * 2);
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  return corners.map((uv) =>
    sourceUvToCanvasPoint(uv, scene, layout, sourceSize, scale),
  );
}

function resizeBounds(
  bounds: LayerBounds,
  corner: Corner,
  uv: CanvasPoint,
): LayerBounds {
  const right = bounds.x + bounds.w;
  const bottom = bounds.y + bounds.h;
  let x = bounds.x;
  let y = bounds.y;
  let w = bounds.w;
  let h = bounds.h;

  if (corner === "se") {
    w = uv.x - x;
    h = uv.y - y;
  } else if (corner === "sw") {
    x = uv.x;
    w = right - x;
    h = uv.y - y;
  } else if (corner === "ne") {
    w = uv.x - x;
    y = uv.y;
    h = bottom - y;
  } else {
    x = uv.x;
    y = uv.y;
    w = right - x;
    h = bottom - y;
  }

  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  return { x, y, w, h };
}

function pointsAttr(points: CanvasPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function LayerOverlay({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const selectedLayerId = useUiStore((state) => state.selectedLayerId);
  const annotationTool = useUiStore((state) => state.annotationTool);
  const annotationStyle = useUiStore((state) => state.annotationStyle);
  const redactTool = useUiStore((state) => state.redactTool);
  const redactStyle = useUiStore((state) => state.redactStyle);
  const cropTool = useUiStore((state) => state.cropTool);
  const cropAspect = useUiStore((state) => state.cropAspect);
  const [cropDrag, setCropDrag] = useState<CropDrag | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [annotationDraft, setAnnotationDraft] =
    useState<AnnotationDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sourceSize: Size | null = imageElement
    ? {
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight,
      }
    : scene.image
      ? { width: scene.image.width, height: scene.image.height }
      : null;
  const scale = width / scene.canvas.baseWidth;
  const displayScene: Scene =
    cropTool && scene.image
      ? { ...scene, image: { ...scene.image, crop: FULL_CROP } }
      : scene;
  const layout = sourceSize
    ? computeCardLayout(
        displayScene,
        scale,
        cropTool
          ? sourceSize
          : (croppedImageSize(scene, sourceSize) ?? sourceSize),
      )
    : null;

  const selectedLayer =
    scene.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  function overlayElement(event: React.PointerEvent): SVGSVGElement | null {
    const target = event.currentTarget;
    if (target instanceof SVGSVGElement) return target;
    return target instanceof SVGElement ? target.ownerSVGElement : null;
  }

  function canvasPoint(event: React.PointerEvent): CanvasPoint {
    const rect = overlayElement(event)?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  }

  function capture(event: React.PointerEvent) {
    const target = event.currentTarget as Element;
    target.setPointerCapture(event.pointerId);
  }

  function beginMove(event: React.PointerEvent, layer: Layer) {
    if (layer.locked) return;
    event.stopPropagation();
    event.preventDefault();
    useUiStore.getState().selectLayer(layer.id);
    const point = canvasPoint(event);
    const startUv =
      layer.kind !== "text" && layout && sourceSize
        ? canvasToSourceUv(point, displayScene, layout, sourceSize, scale)
        : null;
    setInteraction({
      mode: "move",
      pointerId: event.pointerId,
      layer,
      start: point,
      startUv,
    });
    capture(event);
  }

  function beginResizeText(
    event: React.PointerEvent,
    layer: TextLayer,
    edge: "left" | "right",
  ) {
    if (layer.locked) return;
    event.stopPropagation();
    event.preventDefault();
    useUiStore.getState().selectLayer(layer.id);
    setInteraction({
      mode: "resize-text",
      pointerId: event.pointerId,
      layer,
      edge,
    });
    capture(event);
  }

  function beginResizeBox(
    event: React.PointerEvent,
    layer: Layer,
    corner: Corner,
  ) {
    if (layer.locked) return;
    event.stopPropagation();
    event.preventDefault();
    useUiStore.getState().selectLayer(layer.id);
    setInteraction({
      mode: "resize-box",
      pointerId: event.pointerId,
      layer,
      corner,
    });
    capture(event);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const point = canvasPoint(event);
    const store = useEditorStore.getState();

    if (interaction.mode === "move") {
      if (interaction.layer.kind === "text") {
        const startLayer = interaction.layer;
        const dx = (point.x - interaction.start.x) / width;
        const dy = (point.y - interaction.start.y) / height;
        store.updateLayer(
          startLayer.id,
          (layer) =>
            layer.kind === "text"
              ? {
                  ...layer,
                  x: startLayer.x + dx,
                  y: startLayer.y + dy,
                }
              : layer,
          { transient: true },
        );
      } else if (interaction.startUv && layout && sourceSize) {
        const uv = canvasToSourceUv(
          point,
          displayScene,
          layout,
          sourceSize,
          scale,
        );
        const dx = uv.x - interaction.startUv.x;
        const dy = uv.y - interaction.startUv.y;
        store.updateLayer(
          interaction.layer.id,
          (layer) => moveLayerBy(layer, dx, dy),
          { transient: true },
        );
      }
      return;
    }

    if (interaction.mode === "resize-text") {
      const layer = interaction.layer;
      const box = textBox(layer, width, height, scale);
      const left = box.cx - box.width / 2;
      const right = box.cx + box.width / 2;
      const nextLeft = interaction.edge === "left" ? point.x : left;
      const nextRight = interaction.edge === "right" ? point.x : right;
      const newWidthPx = Math.max(10, nextRight - nextLeft);
      const newCenter = (nextLeft + nextRight) / 2;
      store.updateLayer(
        layer.id,
        (current) =>
          current.kind === "text"
            ? {
                ...current,
                width: newWidthPx / width,
                x: newCenter / width,
              }
            : current,
        { transient: true },
      );
      return;
    }

    if (!layout || !sourceSize) return;
    const uv = canvasToSourceUv(point, displayScene, layout, sourceSize, scale);
    const bounds = getLayerBounds(interaction.layer);
    if (!bounds) return;
    const next = resizeBounds(bounds, interaction.corner, uv);
    store.updateLayer(
      interaction.layer.id,
      (layer) => withLayerBounds(layer, next) ?? layer,
      { transient: true },
    );
  }

  function endInteraction(event: React.PointerEvent) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    setInteraction(null);
    useEditorStore.getState().commitScene();
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function beginAnnotation(event: React.PointerEvent) {
    const activeTool = annotationTool ?? (redactTool ? "redact" : null);
    if (!activeTool || !layout || !sourceSize) return;
    const point = canvasPoint(event);
    const uv = canvasToSourceUv(point, displayScene, layout, sourceSize, scale);
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return;
    event.stopPropagation();
    event.preventDefault();

    if (activeTool === "step" || activeTool === "emoji") {
      const layer = buildAnnotationLayer(
        activeTool,
        uv,
        uv,
        annotationStyle,
        scene,
      );
      if (layer) useEditorStore.getState().addLayer(layer);
      return;
    }

    setAnnotationDraft({
      tool: activeTool,
      pointerId: event.pointerId,
      startUv: uv,
      currentUv: uv,
    });
    capture(event);
  }

  function moveAnnotation(event: React.PointerEvent) {
    if (
      !annotationDraft ||
      annotationDraft.pointerId !== event.pointerId ||
      !layout ||
      !sourceSize
    ) {
      return;
    }
    const point = canvasPoint(event);
    const uv = canvasToSourceUv(point, displayScene, layout, sourceSize, scale);
    setAnnotationDraft({
      ...annotationDraft,
      currentUv: {
        x: Math.max(0, Math.min(1, uv.x)),
        y: Math.max(0, Math.min(1, uv.y)),
      },
    });
  }

  function finishAnnotation(event: React.PointerEvent) {
    if (!annotationDraft || annotationDraft.pointerId !== event.pointerId) {
      return;
    }
    const draft = annotationDraft;
    setAnnotationDraft(null);
    const layer =
      draft.tool === "redact"
        ? buildRedactLayer(draft.startUv, draft.currentUv, redactStyle)
        : buildAnnotationLayer(
            draft.tool,
            draft.startUv,
            draft.currentUv,
            annotationStyle,
            scene,
          );
    if (layer) useEditorStore.getState().addLayer(layer);
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function cancelAnnotation(event: React.PointerEvent) {
    if (!annotationDraft || annotationDraft.pointerId !== event.pointerId) {
      return;
    }
    setAnnotationDraft(null);
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function beginCropResize(event: React.PointerEvent, corner: CropCorner) {
    if (!scene.image || !layout || !sourceSize) return;
    event.stopPropagation();
    event.preventDefault();
    const point = canvasPoint(event);
    setCropDrag({
      pointerId: event.pointerId,
      mode: "resize",
      corner,
      startCrop: getImageCrop(scene),
      startUv: canvasToSourceUv(point, displayScene, layout, sourceSize, scale),
    });
    capture(event);
  }

  function beginCropMove(event: React.PointerEvent) {
    if (!scene.image || !layout || !sourceSize) return;
    event.stopPropagation();
    event.preventDefault();
    const point = canvasPoint(event);
    setCropDrag({
      pointerId: event.pointerId,
      mode: "move",
      startCrop: getImageCrop(scene),
      startUv: canvasToSourceUv(point, displayScene, layout, sourceSize, scale),
    });
    capture(event);
  }

  function moveCropDrag(event: React.PointerEvent) {
    if (
      !cropDrag ||
      cropDrag.pointerId !== event.pointerId ||
      !scene.image ||
      !layout ||
      !sourceSize
    ) {
      return;
    }
    const point = canvasPoint(event);
    const uv = canvasToSourceUv(point, displayScene, layout, sourceSize, scale);
    const next =
      cropDrag.mode === "resize" && cropDrag.corner
        ? cropFromCorner(
            cropDrag.startCrop,
            cropDrag.corner,
            uv,
            cropAspectRatio(cropAspect),
            sourceSize,
          )
        : moveCrop(cropDrag.startCrop, {
            x: uv.x - cropDrag.startUv.x,
            y: uv.y - cropDrag.startUv.y,
          });
    useEditorStore
      .getState()
      .setScene(
        (current) =>
          current.image
            ? { ...current, image: { ...current.image, crop: next } }
            : current,
        { transient: true },
      );
  }

  function finishCropDrag(event: React.PointerEvent) {
    if (!cropDrag || cropDrag.pointerId !== event.pointerId) return;
    setCropDrag(null);
    useEditorStore.getState().commitScene();
    const target = event.currentTarget as Element;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  const draftStart =
    annotationDraft && layout && sourceSize
      ? sourceUvToCanvasPoint(
          annotationDraft.startUv,
          displayScene,
          layout,
          sourceSize,
          scale,
        )
      : null;
  const draftEnd =
    annotationDraft && layout && sourceSize
      ? sourceUvToCanvasPoint(
          annotationDraft.currentUv,
          displayScene,
          layout,
          sourceSize,
          scale,
        )
      : null;
  const draftStroke =
    annotationDraft?.tool === "redact"
      ? 2
      : Math.max(1, annotationStyle.stroke * width);
  const draftColor =
    annotationDraft?.tool === "redact"
      ? redactStyle.color
      : annotationStyle.color;
  const draftRect =
    draftStart && draftEnd
      ? {
          x: Math.min(draftStart.x, draftEnd.x),
          y: Math.min(draftStart.y, draftEnd.y),
          width: Math.abs(draftEnd.x - draftStart.x),
          height: Math.abs(draftEnd.y - draftStart.y),
        }
      : null;

  const selection =
    selectedLayer &&
    selectedLayer.visible &&
    !annotationTool &&
    !redactTool &&
    !cropTool
      ? selectedLayer
      : null;
  const cropRect = getImageCrop(scene);
  const cropCorners =
    cropTool && layout && sourceSize
      ? [
          { x: cropRect.x, y: cropRect.y },
          { x: cropRect.x + cropRect.w, y: cropRect.y },
          { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h },
          { x: cropRect.x, y: cropRect.y + cropRect.h },
        ].map((uv) =>
          sourceUvToCanvasPoint(uv, displayScene, layout, sourceSize, scale),
        )
      : null;
  const cropImageQuad =
    cropTool && layout ? imageQuad(displayScene, layout, scale) : null;
  const cropShade =
    cropImageQuad && cropCorners
      ? `M ${cropImageQuad.map(([x, y]) => `${x} ${y}`).join(" L ")} Z M ${cropCorners
          .map((point) => `${point.x} ${point.y}`)
          .join(" L ")} Z`
      : null;
  const selectionText = selection?.kind === "text" ? selection : null;
  const selectionTextBox = selectionText
    ? textBox(selectionText, width, height, scale)
    : null;
  const selectionQuad =
    selection && selection.kind !== "text" && layout && sourceSize
      ? layerImageQuad(selection, displayScene, layout, sourceSize, scale)
      : null;
  const canResizeBox =
    selection?.kind === "redact" ||
    (selection?.kind === "annotation" && selection.shape.type !== "arrow");

  const editingLayer = scene.layers.find(
    (layer): layer is TextLayer =>
      layer.id === editingId && layer.kind === "text",
  );
  const editingBox = editingLayer
    ? textBox(editingLayer, width, height, scale)
    : null;
  const editingBackground = editingLayer?.style.background ?? null;
  const editingShadow = editingLayer?.style.shadow ?? null;

  return (
    <>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        style={{ pointerEvents: "none", touchAction: "none" }}
        onPointerMove={(event) => {
          if (cropDrag) moveCropDrag(event);
          else onPointerMove(event);
        }}
        onPointerUp={(event) => {
          if (cropDrag) finishCropDrag(event);
          else endInteraction(event);
        }}
        onPointerCancel={(event) => {
          if (cropDrag) finishCropDrag(event);
          else endInteraction(event);
        }}
      >
        {scene.layers.map((layer) => {
          if (!layer.visible) return null;

          if (layer.kind === "text") {
            const box = textBox(layer, width, height, scale);
            const transform = `rotate(${box.rotation} ${box.cx} ${box.cy})`;
            return (
              <rect
                key={layer.id}
                x={box.cx - box.width / 2}
                y={box.cy - box.height / 2}
                width={box.width}
                height={box.height}
                transform={transform}
                fill="transparent"
                style={{
                  pointerEvents: layer.locked || cropTool ? "none" : "auto",
                  cursor: "move",
                }}
                onPointerDown={(event) => beginMove(event, layer)}
                onDoubleClick={(event) => {
                  if (layer.locked || cropTool) return;
                  event.stopPropagation();
                  event.preventDefault();
                  useUiStore.getState().selectLayer(layer.id);
                  setEditingId(layer.id);
                }}
              />
            );
          }

          if (!layout || !sourceSize) return null;
          const quad = layerImageQuad(
            layer,
            displayScene,
            layout,
            sourceSize,
            scale,
          );
          if (!quad) return null;
          return (
            <polygon
              key={layer.id}
              points={pointsAttr(quad)}
              fill="transparent"
              style={{
                pointerEvents: layer.locked || cropTool ? "none" : "auto",
                cursor: "move",
              }}
              onPointerDown={(event) => beginMove(event, layer)}
            />
          );
        })}

        {selectionText && selectionTextBox ? (
          <g className="text-primary">
            <rect
              x={selectionTextBox.cx - selectionTextBox.width / 2}
              y={selectionTextBox.cy - selectionTextBox.height / 2}
              width={selectionTextBox.width}
              height={selectionTextBox.height}
              transform={`rotate(${selectionTextBox.rotation} ${selectionTextBox.cx} ${selectionTextBox.cy})`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              style={{ pointerEvents: "none" }}
            />
            {selectionText.locked
              ? null
              : (["left", "right"] as const).map((edge) => {
                  const x =
                    selectionTextBox.cx +
                    (edge === "left" ? -1 : 1) * (selectionTextBox.width / 2);
                  const point = rotatePoint(
                    x,
                    selectionTextBox.cy,
                    selectionTextBox.cx,
                    selectionTextBox.cy,
                    selectionTextBox.rotation,
                  );
                  return (
                    <circle
                      key={edge}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill="var(--background)"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      style={{
                        pointerEvents: "auto",
                        cursor: "ew-resize",
                      }}
                      onPointerDown={(event) =>
                        beginResizeText(event, selectionText, edge)
                      }
                    />
                  );
                })}
          </g>
        ) : null}

        {selection && selectionQuad ? (
          <g className="text-primary">
            <polygon
              points={pointsAttr(selectionQuad)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              style={{ pointerEvents: "none" }}
            />
            {selection.locked || !canResizeBox
              ? null
              : (["nw", "ne", "se", "sw"] as const).map((corner, index) => {
                  const point = selectionQuad[index];
                  return (
                    <circle
                      key={corner}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill="var(--background)"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      style={{
                        pointerEvents: "auto",
                        cursor:
                          corner === "nw" || corner === "se"
                            ? "nwse-resize"
                            : "nesw-resize",
                      }}
                      onPointerDown={(event) =>
                        beginResizeBox(event, selection, corner)
                      }
                    />
                  );
                })}
          </g>
        ) : null}

        {!cropTool && (annotationTool || redactTool) && layout && sourceSize ? (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            style={{ pointerEvents: "auto", cursor: "crosshair" }}
            onPointerDown={beginAnnotation}
            onPointerMove={moveAnnotation}
            onPointerUp={finishAnnotation}
            onPointerCancel={cancelAnnotation}
          />
        ) : null}

        {annotationDraft && draftStart && draftEnd && draftRect ? (
          <g
            fill="none"
            stroke={draftColor}
            strokeWidth={draftStroke}
            strokeDasharray="4 3"
            strokeLinecap="round"
            style={{ pointerEvents: "none" }}
          >
            {annotationDraft.tool === "arrow" ? (
              <line
                x1={draftStart.x}
                y1={draftStart.y}
                x2={draftEnd.x}
                y2={draftEnd.y}
              />
            ) : annotationDraft.tool === "ellipse" ? (
              <ellipse
                cx={draftRect.x + draftRect.width / 2}
                cy={draftRect.y + draftRect.height / 2}
                rx={draftRect.width / 2}
                ry={draftRect.height / 2}
              />
            ) : (
              <rect
                x={draftRect.x}
                y={draftRect.y}
                width={draftRect.width}
                height={draftRect.height}
                fill={
                  annotationDraft.tool === "highlight" ||
                  annotationDraft.tool === "redact"
                    ? draftColor
                    : "none"
                }
                fillOpacity={
                  annotationDraft.tool === "highlight" ||
                  annotationDraft.tool === "redact"
                    ? 0.32
                    : 1
                }
              />
            )}
          </g>
        ) : null}

        {cropTool && layout ? (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            style={{ pointerEvents: "auto", cursor: "default" }}
          />
        ) : null}

        {cropImageQuad && cropCorners && cropShade ? (
          <>
            <path
              d={cropShade}
              fill="rgba(0,0,0,0.45)"
              fillRule="evenodd"
              style={{ pointerEvents: "none" }}
            />
            <polygon
              points={pointsAttr(cropCorners)}
              fill="transparent"
              style={{ pointerEvents: "auto", cursor: "move" }}
              onPointerDown={beginCropMove}
            />
            <g className="text-white">
              <polygon
                points={pointsAttr(cropCorners)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="6 4"
                style={{
                  pointerEvents: "none",
                  filter: "drop-shadow(0 0 1px rgba(0,0,0,0.9))",
                }}
              />
              {cropCorners.map((point, index) => {
                const corners = ["nw", "ne", "se", "sw"] as const;
                return (
                  <circle
                    key={corners[index]}
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill="var(--background)"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{
                      pointerEvents: "auto",
                      cursor:
                        index === 0 || index === 2
                          ? "nwse-resize"
                          : "nesw-resize",
                    }}
                    onPointerDown={(event) =>
                      beginCropResize(event, corners[index])
                    }
                  />
                );
              })}
            </g>
          </>
        ) : null}
      </svg>
      {cropTool ? (
        <div className="bg-background/85 text-muted-foreground pointer-events-none absolute top-2 left-2 z-10 rounded-full border px-3 py-1 text-[11px] shadow-sm backdrop-blur">
          Crop: drag corners to resize, drag inside to move · Esc to finish
        </div>
      ) : null}
      {editingLayer?.kind === "text" && editingBox ? (
        <textarea
          autoFocus
          aria-label="Edit text layer"
          value={editingLayer.text}
          onChange={(event) =>
            useEditorStore
              .getState()
              .updateLayer(
                editingLayer.id,
                (current) =>
                  current.kind === "text"
                    ? { ...current, text: event.target.value }
                    : current,
                { transient: true },
              )
          }
          onBlur={() => {
            useEditorStore.getState().commitScene();
            setEditingId(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              useEditorStore.getState().commitScene();
              setEditingId(null);
            }
          }}
          style={{
            position: "absolute",
            left: editingBox.cx - editingBox.width / 2,
            top: editingBox.cy - editingBox.height / 2,
            width: editingBox.width,
            height: editingBox.height,
            transform: `rotate(${editingBox.rotation}deg)`,
            transformOrigin: "center",
            fontFamily: fontStack(editingLayer.style.font),
            fontWeight: editingLayer.style.weight,
            fontSize: editingLayer.style.size * scale,
            lineHeight: editingLayer.style.lineHeight,
            letterSpacing: `${editingLayer.style.letterSpacing}em`,
            color: editingLayer.style.color,
            textAlign: editingLayer.style.align,
            textShadow: editingShadow
              ? `0 ${editingShadow.y * scale}px ${editingShadow.blur * scale}px ${editingShadow.color}`
              : undefined,
            padding: (editingBackground?.padding ?? 0) * scale,
            background: editingBackground?.color ?? "transparent",
            borderRadius: (editingBackground?.radius ?? 0) * scale,
            border: "1px dashed var(--ring)",
            outline: "none",
            resize: "none",
            overflow: "hidden",
            pointerEvents: "auto",
            zIndex: 10,
          }}
        />
      ) : null}
    </>
  );
}
