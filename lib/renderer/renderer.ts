import { getImageCrop, type ImageCrop, type Scene } from "@/lib/scene";
import { findMeshPreset, type MeshPreset } from "@/lib/backgrounds/presets";
import { parseColor } from "./color";
import { composeFrameCanvas, loadFrameImages } from "./frame-canvas";
import {
  FRAME_DESIGN_WIDTH,
  getFrameConfig,
  getFrameMetrics,
  type FrameConfig,
} from "./frames";
import {
  DEFAULT_CAMERA_DIST,
  STYLE_PARAMS,
  boundingRect,
  computeCardLayout,
  isPlateVisible,
  projectTiltedCorners,
} from "./geometry";
import type { CardLayout, Rect } from "./geometry";
import {
  ROUND_RECT_SDF,
  createGlFbo,
  createGlProgram,
  createGlTexture,
  deleteGlFbo,
  squareToQuad,
  uploadGlTexture,
} from "./gl";
import type { GlFbo, GlProgram } from "./gl";
import {
  DEFAULT_WATERMARK_PLACEMENT,
  clampWatermarkOpacity,
  watermarkRect,
} from "./watermark-placement";
import type {
  PreviewAssets,
  RenderBlobResult,
  RenderOptions,
  Renderer,
  TextLayerAsset,
} from "./types";

const GRID = 24;

type FrameBox = {
  config: FrameConfig;
  s: number;
  rect: Rect;
  screenWidth: number;
  screenHeight: number;
};

const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform int uMode;
uniform vec3 uSolid;
uniform vec3 uStopColors[4];
uniform float uStopAts[4];
uniform int uStopCount;
uniform float uAngle;
uniform sampler2D uTex;
uniform vec2 uTexScale;
void main() {
  vec3 color;
  if (uMode == 2) {
    vec2 uv = (vUv - 0.5) * uTexScale + 0.5;
    color = texture(uTex, uv).rgb;
  } else if (uMode == 1) {
    float rad = radians(uAngle);
    vec2 dir = vec2(cos(rad), sin(rad));
    float t = clamp(dot(vUv - 0.5, dir) + 0.5, 0.0, 1.0);
    color = uStopColors[0];
    for (int i = 0; i < 3; i++) {
      if (i + 1 >= uStopCount) break;
      float a0 = uStopAts[i];
      float a1 = uStopAts[i + 1];
      float f = clamp((t - a0) / max(a1 - a0, 0.0001), 0.0, 1.0);
      color = mix(color, uStopColors[i + 1], f);
    }
  } else {
    color = uSolid;
  }
  outColor = vec4(color, 1.0);
}`;

const MESH_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec3 uBase;
uniform float uAspect;
uniform int uBlobCount;
uniform vec2 uBlobCenter[5];
uniform float uBlobRadius[5];
uniform vec3 uBlobColor[5];
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec3 color = uBase;
  for (int i = 0; i < 5; i++) {
    if (i >= uBlobCount) break;
    vec2 center = (uBlobCenter[i] - 0.5) * vec2(uAspect, 1.0);
    float d = distance(p, center);
    float a = smoothstep(uBlobRadius[i], 0.0, d);
    color = mix(color, uBlobColor[i], a);
  }
  outColor = vec4(color, 1.0);
}`;

const SHADOW_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uRadius;
uniform float uSpread;
uniform float uAlpha;
out vec4 outColor;
${ROUND_RECT_SDF}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = uRect.xy + uRect.zw * 0.5;
  float d = sdRoundRect(p - c, uRect.zw * 0.5, uRadius);
  float a = uAlpha * (1.0 - smoothstep(0.0, uSpread, max(d, 0.0)));
  outColor = vec4(0.02, 0.02, 0.06, a);
}`;

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform int uMesh;
uniform vec2 uRes;
uniform vec2 uSize;
uniform vec4 uRect;
uniform float uRadius;
uniform vec4 uFill;
uniform vec4 uBorderColor;
uniform float uBorderWidth;
uniform float uInsetAlpha;
uniform vec3 uInsetColor;
uniform int uGlass;
uniform sampler2D uGlassTex;
uniform vec4 uGlassTint;
${ROUND_RECT_SDF}
void main() {
  vec2 p;
  vec2 center;
  vec2 halfSize;
  if (uMesh == 1) {
    p = vUv * uSize;
    center = uSize * 0.5;
    halfSize = uSize * 0.5;
  } else {
    p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    center = uRect.xy + uRect.zw * 0.5;
    halfSize = uRect.zw * 0.5;
  }
  float d = sdRoundRect(p - center, halfSize, uRadius);
  float mask = 1.0 - smoothstep(-1.0, 1.0, d);
  vec4 color;
  if (uGlass == 1) {
    vec3 blurred = texture(uGlassTex, gl_FragCoord.xy / uRes).rgb;
    vec3 glassColor = mix(blurred, uGlassTint.rgb, uGlassTint.a);
    color = vec4(glassColor, 1.0);
  } else {
    color = uFill;
  }
  if (uBorderWidth > 0.0) {
    float edgeBand = clamp(1.0 - abs(d) / uBorderWidth, 0.0, 1.0);
    color = mix(color, vec4(uBorderColor.rgb, 1.0), edgeBand * uBorderColor.a);
  }
  if (uInsetAlpha > 0.0) {
    float inset = uInsetAlpha * (1.0 - smoothstep(0.0, 36.0, max(-d, 0.0)));
    color.rgb = mix(color.rgb, uInsetColor, inset);
  }
  outColor = vec4(color.rgb, color.a * mask);
}`;

const IMAGE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uRadius;
uniform float uDeviceScreen;
uniform float uContain;
uniform float uSourceAspect;
uniform vec4 uCrop;
${ROUND_RECT_SDF}
void main() {
  vec2 p = vUv * uSize;
  float d = sdRoundRect(p - uSize * 0.5, uSize * 0.5, uRadius);
  float mask = 1.0 - smoothstep(-0.75, 0.75, d);
  vec2 uv = vUv;
  if (uDeviceScreen > 0.5) {
    float sourceAspect = uSourceAspect;
    float targetAspect = uSize.x / uSize.y;
    vec2 crop = vec2(min(1.0, targetAspect / sourceAspect), min(1.0, sourceAspect / targetAspect));
    if (uContain > 0.5) {
      vec2 fit = vec2(min(1.0, sourceAspect / targetAspect), min(1.0, targetAspect / sourceAspect));
      uv = (uv - 0.5) / fit + 0.5;
      if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
        outColor = vec4(vec3(0.035), mask);
        return;
      }
    } else {
      uv = (uv - 0.5) * crop + 0.5;
    }
  }
  uv = uCrop.xy + uv * uCrop.zw;
  vec4 c = texture(uTex, uv);
  outColor = vec4(c.rgb, c.a * mask);
}`;

const TEXT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform float uOpacity;
void main() {
  vec4 c = texture(uTex, vUv);
  outColor = vec4(c.rgb, c.a * uOpacity);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  float w[7] = float[7](0.196482, 0.174875, 0.120981, 0.066824, 0.029152, 0.010062, 0.002646);
  vec4 sum = texture(uTex, vUv) * w[0];
  for (int i = 1; i < 7; i++) {
    vec2 o = uDir * float(i);
    sum += texture(uTex, vUv + o) * w[i];
    sum += texture(uTex, vUv - o) * w[i];
  }
  outColor = sum;
}`;

const SUNLIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform int uMode;
uniform float uStrength;
uniform float uAngle;
uniform float uSoftness;
uniform float uTemperature;
uniform int uHasOverlay;
uniform sampler2D uOverlay;
void main() {
  float v;
  if (uHasOverlay == 1) {
    float rad = radians(uAngle);
    float ca = cos(rad);
    float sa = sin(rad);
    vec2 p = vUv - 0.5;
    vec2 uv = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca) + 0.5;
    v = texture(uOverlay, clamp(uv, 0.0, 1.0)).r;
  } else {
    float rad = radians(uAngle);
    vec2 dir = vec2(cos(rad), sin(rad));
    float t = clamp(dot(vUv - 0.5, dir) + 0.5, 0.0, 1.0);
    v = mix(0.5, 1.0, pow(t, mix(2.6, 0.9, uSoftness)));
  }
  vec3 warm = vec3(1.0 + uTemperature * 0.22, 1.0, 1.0 - uTemperature * 0.18);
  if (uMode == 0) {
    float light = max(v - 0.5, 0.0) * 2.0 * uStrength;
    outColor = vec4(warm * light, 0.0);
  } else {
    float shadow = max(0.5 - v, 0.0) * 2.0 * uStrength;
    vec3 cool = vec3(1.0 - uTemperature * 0.06, 1.0 - uTemperature * 0.02, 1.0 + uTemperature * 0.08);
    outColor = vec4(cool * (1.0 - shadow), 0.0);
  }
}`;

const GRAIN_FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform float uAmount;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  float n = hash(floor(gl_FragCoord.xy)) - 0.5;
  outColor = vec4(vec3(n * uAmount), 0.0);
}`;

const WATERMARK_FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uOpacity;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = (p - uRect.xy) / uRect.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 color = texture(uTex, vec2(uv.x, 1.0 - uv.y));
  outColor = vec4(color.rgb, color.a * uOpacity);
}`;

export class WebGL2Renderer implements Renderer {
  private disposed = false;
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private bgProgram: GlProgram | null = null;
  private shadowProgram: GlProgram | null = null;
  private plateProgram: GlProgram | null = null;
  private imageProgram: GlProgram | null = null;
  private meshProgram: GlProgram | null = null;
  private blurProgram: GlProgram | null = null;
  private sunlightProgram: GlProgram | null = null;
  private grainProgram: GlProgram | null = null;
  private watermarkProgram: GlProgram | null = null;
  private textProgram: GlProgram | null = null;
  private triVao: WebGLVertexArrayObject | null = null;
  private triBuf: WebGLBuffer | null = null;
  private meshVao: WebGLVertexArrayObject | null = null;
  private meshPosBuf: WebGLBuffer | null = null;
  private meshUvBuf: WebGLBuffer | null = null;
  private meshIndexBuf: WebGLBuffer | null = null;
  private meshPositions = new Float32Array((GRID + 1) * (GRID + 1) * 2);
  private textures = new Map<string, WebGLTexture>();
  private glassFbo: GlFbo | null = null;
  private blurFbo: GlFbo | null = null;
  private fboWidth = 0;
  private fboHeight = 0;
  private assets: PreviewAssets = {};
  private textLayers: TextLayerAsset[] = [];
  private textSources = new Map<string, TexImageSource>();
  private watermarkSize: { width: number; height: number } | null = null;
  private frameTextureKey: string | null = null;

  async init(target: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    const gl = target.getContext("webgl2", {
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable in this browser");
    await loadFrameImages();
    if (this.disposed) return;
    this.canvas = target;
    this.gl = gl;

    this.bgProgram = createGlProgram(gl, BG_FS);
    this.shadowProgram = createGlProgram(gl, SHADOW_FS);
    this.plateProgram = createGlProgram(gl, PLATE_FS);
    this.imageProgram = createGlProgram(gl, IMAGE_FS);
    this.meshProgram = createGlProgram(gl, MESH_FS);
    this.blurProgram = createGlProgram(gl, BLUR_FS);
    this.sunlightProgram = createGlProgram(gl, SUNLIGHT_FS);
    this.grainProgram = createGlProgram(gl, GRAIN_FS);
    this.watermarkProgram = createGlProgram(gl, WATERMARK_FS);
    this.textProgram = createGlProgram(gl, TEXT_FS);

    const triData = new Float32Array([-1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2]);
    const triBuf = gl.createBuffer();
    const triVao = gl.createVertexArray();
    if (!triBuf || !triVao) throw new Error("Triangle buffers fail");
    gl.bindVertexArray(triVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    this.triBuf = triBuf;
    this.triVao = triVao;

    const uvData = new Float32Array((GRID + 1) * (GRID + 1) * 2);
    const idxData = new Uint16Array(GRID * GRID * 6);
    let vi = 0;
    let ii = 0;
    for (let j = 0; j <= GRID; j++) {
      for (let i = 0; i <= GRID; i++) {
        uvData[vi++] = i / GRID;
        uvData[vi++] = 1 - j / GRID;
      }
    }
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const a = j * (GRID + 1) + i;
        idxData[ii++] = a;
        idxData[ii++] = a + 1;
        idxData[ii++] = a + GRID + 1;
        idxData[ii++] = a + 1;
        idxData[ii++] = a + GRID + 2;
        idxData[ii++] = a + GRID + 1;
      }
    }
    const posBuf = gl.createBuffer();
    const uvBuf = gl.createBuffer();
    const indexBuf = gl.createBuffer();
    const meshVao = gl.createVertexArray();
    if (!posBuf || !uvBuf || !indexBuf || !meshVao) {
      throw new Error("Mesh buffers fail");
    }
    gl.bindVertexArray(meshVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      (GRID + 1) * (GRID + 1) * 8,
      gl.DYNAMIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxData, gl.STATIC_DRAW);
    this.meshPosBuf = posBuf;
    this.meshUvBuf = uvBuf;
    this.meshIndexBuf = indexBuf;
    this.meshVao = meshVao;
  }

  setAssets(partial: Partial<PreviewAssets>) {
    this.assets = { ...this.assets, ...partial };
    const gl = this.gl;
    if (!gl) return;
    if (partial.screenshot) {
      this.upload("screenshot", partial.screenshot);
    } else if ("screenshot" in partial) {
      this.deleteTexture("screenshot");
    }
    if (partial.backgroundImage)
      this.upload("background", partial.backgroundImage);
    if (partial.videoFrame) this.upload("video", partial.videoFrame);
    if (partial.sunlightOverlay) {
      this.upload("overlay", partial.sunlightOverlay);
    } else if ("sunlightOverlay" in partial) {
      this.deleteTexture("overlay");
    }
    if (partial.watermark) {
      this.upload("watermark", partial.watermark);
      const size = partial.watermark as { width?: number; height?: number };
      this.watermarkSize =
        typeof size.width === "number" && typeof size.height === "number"
          ? { width: size.width, height: size.height }
          : null;
    }
    if ("textLayers" in partial) {
      const next = partial.textLayers ?? [];
      for (const item of next) {
        if (this.textSources.get(item.id) !== item.source) {
          this.upload(`text:${item.id}`, item.source);
          this.textSources.set(item.id, item.source);
        }
      }
      const keep = new Set(next.map((item) => item.id));
      for (const id of [...this.textSources.keys()]) {
        if (!keep.has(id)) {
          this.deleteTexture(`text:${id}`);
          this.textSources.delete(id);
        }
      }
      this.textLayers = next;
    }
  }

  render(scene: Scene, options: RenderOptions) {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas) throw new Error("The renderer is not initialized");

    const crop = options.cropOverride ?? getImageCrop(scene);
    const screenshotSize = this.assets.screenshotSize ?? null;
    const displaySize = screenshotSize
      ? {
          width: screenshotSize.width * crop.w,
          height: screenshotSize.height * crop.h,
        }
      : null;
    const layout = computeCardLayout(scene, options.scale, displaySize);
    const width = layout.output.width;
    const height = layout.output.height;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);

    const style = STYLE_PARAMS[scene.style.preset];
    const useGlass = style.glassBlurPx > 0;
    if (useGlass)
      this.renderGlassBackground(scene, width, height, style.glassBlurPx);

    gl.disable(gl.BLEND);
    this.drawBackground(scene, width, height);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    const frameBox = this.computeFrameBox(scene, layout);
    this.drawShadow(scene, layout, options.scale, frameBox);
    this.drawPlate(scene, layout, options.scale, useGlass);
    this.drawScreenshot(scene, layout, options.scale, frameBox, crop);

    this.drawFrame(scene, frameBox, options.scale);
    this.drawTextLayers();
    this.drawSunlight(scene);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
    this.drawGrain(scene);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    this.drawWatermark(scene, options.scale);
  }

  async renderToBlob(
    scene: Scene,
    options: RenderOptions,
  ): Promise<RenderBlobResult> {
    this.render(scene, options);
    const canvas = this.canvas;
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Image export requires an HTML canvas");
    }
    const t0 = performance.now();
    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to create an image from the canvas"));
        }, "image/png");
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    return {
      blob,
      ms: performance.now() - t0,
      width: canvas.width,
      height: canvas.height,
    };
  }

  dispose() {
    this.disposed = true;
    const gl = this.gl;
    if (gl) {
      for (const texture of this.textures.values()) gl.deleteTexture(texture);
      if (this.glassFbo) deleteGlFbo(gl, this.glassFbo);
      if (this.blurFbo) deleteGlFbo(gl, this.blurFbo);
      if (this.triBuf) gl.deleteBuffer(this.triBuf);
      if (this.meshPosBuf) gl.deleteBuffer(this.meshPosBuf);
      if (this.meshUvBuf) gl.deleteBuffer(this.meshUvBuf);
      if (this.meshIndexBuf) gl.deleteBuffer(this.meshIndexBuf);
      if (this.triVao) gl.deleteVertexArray(this.triVao);
      if (this.meshVao) gl.deleteVertexArray(this.meshVao);
      for (const program of [
        this.bgProgram,
        this.shadowProgram,
        this.plateProgram,
        this.imageProgram,
        this.meshProgram,
        this.blurProgram,
        this.sunlightProgram,
        this.grainProgram,
        this.watermarkProgram,
        this.textProgram,
      ]) {
        if (program) gl.deleteProgram(program.program);
      }
    }
    this.textures.clear();
    this.textSources.clear();
    this.textLayers = [];
    this.glassFbo = null;
    this.blurFbo = null;
    this.frameTextureKey = null;
    this.gl = null;
    this.canvas = null;
  }

  private upload(key: string, source: TexImageSource) {
    const gl = this.gl;
    if (!gl) return;
    let texture = this.textures.get(key);
    if (!texture) {
      texture = createGlTexture(gl);
      this.textures.set(key, texture);
    }
    uploadGlTexture(gl, texture, source);
  }

  private deleteTexture(key: string) {
    const gl = this.gl;
    const texture = this.textures.get(key);
    if (gl && texture) gl.deleteTexture(texture);
    this.textures.delete(key);
  }

  private getTexture(key: string): WebGLTexture | null {
    return this.textures.get(key) ?? null;
  }

  private renderGlassBackground(
    scene: Scene,
    width: number,
    height: number,
    blurPx: number,
  ) {
    const gl = this.gl;
    if (!gl) return;
    const fw = Math.max(2, Math.floor(width / 2));
    const fh = Math.max(2, Math.floor(height / 2));
    if (
      !this.glassFbo ||
      !this.blurFbo ||
      this.fboWidth !== fw ||
      this.fboHeight !== fh
    ) {
      if (this.glassFbo) deleteGlFbo(gl, this.glassFbo);
      if (this.blurFbo) deleteGlFbo(gl, this.blurFbo);
      this.glassFbo = createGlFbo(gl, fw, fh);
      this.blurFbo = createGlFbo(gl, fw, fh);
      this.fboWidth = fw;
      this.fboHeight = fh;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glassFbo.framebuffer);
    gl.viewport(0, 0, fw, fh);
    gl.disable(gl.BLEND);
    this.drawBackground(scene, fw, fh);

    const blur = this.blurProgram;
    if (!blur) return;
    gl.useProgram(blur.program);
    const stride = Math.max(1, blurPx * 0.5);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFbo.framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glassFbo.texture);
    gl.uniform1i(blur.uniforms.uTex, 0);
    gl.uniform2f(blur.uniforms.uDir, stride / fw, 0);
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glassFbo.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, this.blurFbo.texture);
    gl.uniform2f(blur.uniforms.uDir, 0, stride / fh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
  }

  private drawBackground(scene: Scene, width: number, height: number) {
    const gl = this.gl;
    const program = this.bgProgram;
    if (!gl || !program) return;
    gl.useProgram(program.program);
    const u = program.uniforms;
    const background = scene.background;

    const drawTexture = (key: string, aspect: number | null | undefined) => {
      const texture = this.getTexture(key);
      if (!texture) {
        gl.uniform1i(u.uMode, 0);
        gl.uniform3f(u.uSolid, 0.08, 0.08, 0.1);
        return;
      }
      gl.uniform1i(u.uMode, 2);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u.uTex, 0);
      const canvasAspect = width / height;
      const sourceAspect = aspect && aspect > 0 ? aspect : canvasAspect;
      let sx = 1;
      let sy = 1;
      if (sourceAspect > canvasAspect) sx = canvasAspect / sourceAspect;
      else sy = sourceAspect / canvasAspect;
      gl.uniform2f(u.uTexScale, sx, sy);
    };

    if (background.kind === "solid") {
      const [r, g, b] = parseColor(background.color);
      gl.uniform1i(u.uMode, 0);
      gl.uniform3f(u.uSolid, r, g, b);
    } else if (background.kind === "gradient") {
      this.setGradientUniforms(background);
    } else if (background.kind === "video") {
      drawTexture("video", this.assets.videoAspect);
    } else if (background.kind === "image") {
      drawTexture("background", this.assets.backgroundAspect);
    } else {
      const preset =
        background.kind === "mesh" ? findMeshPreset(background.presetId) : null;
      if (preset && this.meshProgram) {
        this.drawMeshBackground(preset, width, height);
        return;
      }
      gl.uniform1i(u.uMode, 0);
      gl.uniform3f(u.uSolid, 0.08, 0.08, 0.1);
    }

    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private setGradientUniforms(background: {
    stops: { color: string; at: number }[];
    angle: number;
  }) {
    const gl = this.gl;
    const program = this.bgProgram;
    if (!gl || !program) return;
    const u = program.uniforms;
    const stops = background.stops.slice(0, 4);
    const colors = new Float32Array(12);
    const ats = new Float32Array([0, 0, 0, 0]);
    stops.forEach((stop, index) => {
      const [r, g, b] = parseColor(stop.color);
      colors[index * 3] = r;
      colors[index * 3 + 1] = g;
      colors[index * 3 + 2] = b;
      ats[index] = stop.at;
    });
    gl.uniform1i(u.uMode, 1);
    gl.uniform3fv(u.uStopColors, colors);
    gl.uniform1fv(u.uStopAts, ats);
    gl.uniform1i(u.uStopCount, stops.length);
    gl.uniform1f(u.uAngle, background.angle);
  }

  private drawMeshBackground(
    preset: MeshPreset,
    width: number,
    height: number,
  ) {
    const gl = this.gl;
    const program = this.meshProgram;
    if (!gl || !program) return;
    gl.useProgram(program.program);
    const u = program.uniforms;
    const [baseR, baseG, baseB] = parseColor(preset.base);
    gl.uniform3f(u.uBase, baseR, baseG, baseB);
    gl.uniform1f(u.uAspect, width / height);
    const blobs = preset.blobs.slice(0, 5);
    const centers = new Float32Array(10);
    const radii = new Float32Array(5);
    const colors = new Float32Array(15);
    blobs.forEach((blob, index) => {
      centers[index * 2] = blob.x;
      centers[index * 2 + 1] = blob.y;
      radii[index] = blob.radius;
      const [r, g, b] = parseColor(blob.color);
      colors[index * 3] = r;
      colors[index * 3 + 1] = g;
      colors[index * 3 + 2] = b;
    });
    gl.uniform2fv(u.uBlobCenter, centers);
    gl.uniform1fv(u.uBlobRadius, radii);
    gl.uniform3fv(u.uBlobColor, colors);
    gl.uniform1i(u.uBlobCount, blobs.length);
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawShadow(
    scene: Scene,
    layout: CardLayout,
    scale: number,
    frameBox: FrameBox | null,
  ) {
    const gl = this.gl;
    const program = this.shadowProgram;
    const canvas = this.canvas;
    if (!gl || !program || !canvas) return;
    if (!this.getTexture("screenshot") && !isPlateVisible(scene) && !frameBox)
      return;
    const shadow = layout.shadow;
    if (shadow.alpha <= 0 || shadow.spreadPx <= 0) return;

    let rect = frameBox ? frameBox.rect : layout.plateRect;
    const radius = frameBox
      ? frameBox.config.radius * frameBox.s
      : layout.plateRadiusPx;
    if (scene.transform.tiltX !== 0 || scene.transform.tiltY !== 0) {
      const corners = projectTiltedCorners(
        rect,
        scene.transform.tiltX,
        scene.transform.tiltY,
        DEFAULT_CAMERA_DIST * scale,
      );
      rect = boundingRect(corners);
    }
    const shadowRect = {
      x: rect.x,
      y: rect.y + shadow.offsetYPx,
      width: rect.width,
      height: rect.height,
    };

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform4f(
      u.uRect,
      shadowRect.x,
      shadowRect.y,
      shadowRect.width,
      shadowRect.height,
    );
    gl.uniform1f(u.uRadius, radius);
    gl.uniform1f(u.uSpread, shadow.spreadPx);
    gl.uniform1f(u.uAlpha, shadow.alpha);
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawPlate(
    scene: Scene,
    layout: CardLayout,
    scale: number,
    useGlass: boolean,
  ) {
    const gl = this.gl;
    const program = this.plateProgram;
    const canvas = this.canvas;
    if (!gl || !program || !canvas) return;
    if (!useGlass && !isPlateVisible(scene)) return;
    const style = STYLE_PARAMS[scene.style.preset];

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.uniform4f(
      u.uFill,
      style.fill[0],
      style.fill[1],
      style.fill[2],
      style.fill[3],
    );
    gl.uniform4f(
      u.uBorderColor,
      style.borderColor[0],
      style.borderColor[1],
      style.borderColor[2],
      style.borderColor[3],
    );
    gl.uniform1f(u.uBorderWidth, style.borderWidthPx * scale);
    gl.uniform1f(u.uInsetAlpha, style.insetAlpha);
    const insetColor: [number, number, number] = scene.style.preset.includes(
      "dark",
    )
      ? [0, 0, 0]
      : [1, 1, 1];
    gl.uniform3f(u.uInsetColor, insetColor[0], insetColor[1], insetColor[2]);
    gl.uniform1i(u.uGlass, useGlass ? 1 : 0);
    if (useGlass && this.glassFbo) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.glassFbo.texture);
      gl.uniform1i(u.uGlassTex, 0);
    }
    gl.uniform4f(
      u.uGlassTint,
      style.glassTint[0],
      style.glassTint[1],
      style.glassTint[2],
      style.glassTint[3],
    );

    const tilted = scene.transform.tiltX !== 0 || scene.transform.tiltY !== 0;
    if (tilted) {
      gl.uniform1i(u.uMesh, 1);
      gl.uniform2f(u.uSize, layout.plateRect.width, layout.plateRect.height);
      gl.uniform1f(u.uRadius, layout.plateRadiusPx);
      this.updateMesh(
        layout.plateRect,
        scene.transform.tiltX,
        scene.transform.tiltY,
        DEFAULT_CAMERA_DIST * scale,
      );
      gl.bindVertexArray(this.meshVao);
      gl.drawElements(gl.TRIANGLES, GRID * GRID * 6, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.uniform1i(u.uMesh, 0);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform4f(
        u.uRect,
        layout.plateRect.x,
        layout.plateRect.y,
        layout.plateRect.width,
        layout.plateRect.height,
      );
      gl.uniform1f(u.uRadius, layout.plateRadiusPx);
      gl.bindVertexArray(this.triVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  private drawScreenshot(
    scene: Scene,
    layout: CardLayout,
    scale: number,
    frameBox: FrameBox | null,
    crop: ImageCrop,
  ) {
    const gl = this.gl;
    const program = this.imageProgram;
    if (!gl || !program) return;
    const texture = this.getTexture("screenshot");
    if (!texture) return;

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uSize, layout.imageRect.width, layout.imageRect.height);
    gl.uniform1f(u.uDeviceScreen, frameBox?.config.screenAspect ? 1 : 0);
    gl.uniform1f(u.uContain, scene.frame.fit === "contain" ? 1 : 0);
    const screenshotSize = this.assets.screenshotSize ?? null;
    const displaySize = screenshotSize
      ? {
          width: screenshotSize.width * crop.w,
          height: screenshotSize.height * crop.h,
        }
      : null;
    gl.uniform1f(
      u.uSourceAspect,
      displaySize ? displaySize.width / displaySize.height : 1,
    );
    gl.uniform4f(u.uCrop, crop.x, crop.y, crop.w, crop.h);
    gl.uniform1f(
      u.uRadius,
      frameBox
        ? frameBox.config.screenRadius * frameBox.s
        : layout.imageRadiusPx,
    );

    this.updateMesh(
      layout.imageRect,
      scene.transform.tiltX,
      scene.transform.tiltY,
      DEFAULT_CAMERA_DIST * scale,
    );
    gl.bindVertexArray(this.meshVao);
    gl.drawElements(gl.TRIANGLES, GRID * GRID * 6, gl.UNSIGNED_SHORT, 0);
  }

  private computeFrameBox(scene: Scene, layout: CardLayout): FrameBox | null {
    const config = getFrameConfig(scene.frame.kind);
    if (!config) return null;
    const s = layout.imageRect.width / FRAME_DESIGN_WIDTH;
    const metrics = getFrameMetrics(config);
    return {
      config,
      s,
      rect: {
        x: layout.imageRect.x - metrics.left * s,
        y: layout.imageRect.y - metrics.top * s,
        width: layout.imageRect.width + (metrics.left + metrics.right) * s,
        height: layout.imageRect.height + (metrics.top + metrics.bottom) * s,
      },
      screenWidth: layout.imageRect.width,
      screenHeight: layout.imageRect.height,
    };
  }

  private drawFrame(scene: Scene, frameBox: FrameBox | null, scale: number) {
    const gl = this.gl;
    const program = this.imageProgram;
    if (!gl || !program || !frameBox) return;
    const key = `${scene.frame.kind}:${Math.round(frameBox.rect.width)}x${Math.round(
      frameBox.rect.height,
    )}`;
    if (this.frameTextureKey !== key) {
      const composed = composeFrameCanvas(
        scene.frame.kind,
        frameBox.screenWidth,
        frameBox.screenHeight,
      );
      if (!composed) return;
      this.upload("frame", composed);
      this.frameTextureKey = key;
    }
    const texture = this.getTexture("frame");
    if (!texture) return;

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uSize, frameBox.rect.width, frameBox.rect.height);
    gl.uniform1f(u.uDeviceScreen, 0);
    gl.uniform1f(u.uSourceAspect, 1);
    gl.uniform4f(u.uCrop, 0, 0, 1, 1);
    gl.uniform1f(u.uRadius, 0);
    this.updateMesh(
      frameBox.rect,
      scene.transform.tiltX,
      scene.transform.tiltY,
      DEFAULT_CAMERA_DIST * scale,
    );
    gl.bindVertexArray(this.meshVao);
    gl.drawElements(gl.TRIANGLES, GRID * GRID * 6, gl.UNSIGNED_SHORT, 0);
  }

  private drawTextLayers() {
    const gl = this.gl;
    const program = this.textProgram;
    const canvas = this.canvas;
    if (!gl || !program || !canvas || this.textLayers.length === 0) return;

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.uniform1i(u.uTex, 0);

    for (const item of this.textLayers) {
      const texture = this.getTexture(`text:${item.id}`);
      if (!texture) continue;
      const widthPx = item.width * canvas.width;
      const heightPx = widthPx * item.aspect;
      const cx = item.x * canvas.width;
      const cy = item.y * canvas.height;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1f(u.uOpacity, item.opacity ?? 1);
      this.updateRotatedMesh(
        {
          x: cx - widthPx / 2,
          y: cy - heightPx / 2,
          width: widthPx,
          height: heightPx,
        },
        item.rotation,
      );
      gl.bindVertexArray(this.meshVao);
      gl.drawElements(gl.TRIANGLES, GRID * GRID * 6, gl.UNSIGNED_SHORT, 0);
    }
  }

  private updateRotatedMesh(rect: Rect, rotationDegrees: number) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const radians = (rotationDegrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rotate = (x: number, y: number): [number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    };
    this.updateMeshCorners([
      rotate(rect.x, rect.y),
      rotate(rect.x + rect.width, rect.y),
      rotate(rect.x + rect.width, rect.y + rect.height),
      rotate(rect.x, rect.y + rect.height),
    ]);
  }

  private updateMesh(rect: Rect, tiltX: number, tiltY: number, camera: number) {
    this.updateMeshCorners(projectTiltedCorners(rect, tiltX, tiltY, camera));
  }

  private updateMeshCorners(corners: [number, number][]) {
    const gl = this.gl;
    const canvas = this.canvas;
    const buffer = this.meshPosBuf;
    if (!gl || !canvas || !buffer) return;

    const matrix = squareToQuad(corners);
    const positions = this.meshPositions;
    const width = canvas.width;
    const height = canvas.height;

    for (let j = 0; j <= GRID; j++) {
      for (let i = 0; i <= GRID; i++) {
        const u = i / GRID;
        const v = j / GRID;
        const den = matrix[6] * u + matrix[7] * v + 1;
        const px = (matrix[0] * u + matrix[1] * v + matrix[2]) / den;
        const py = (matrix[3] * u + matrix[4] * v + matrix[5]) / den;
        const index = (j * (GRID + 1) + i) * 2;
        positions[index] = (px / width) * 2 - 1;
        positions[index + 1] = 1 - (py / height) * 2;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
  }

  private drawSunlight(scene: Scene) {
    const gl = this.gl;
    const program = this.sunlightProgram;
    const canvas = this.canvas;
    if (!gl || !program || !canvas) return;
    const sunlight = scene.sunlight;
    const overlayTexture =
      sunlight.overlay !== "none" ? this.getTexture("overlay") : null;
    if (sunlight.strength <= 0 && !overlayTexture) return;

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.uniform1f(u.uStrength, sunlight.strength / 100);
    gl.uniform1f(u.uAngle, sunlight.angle);
    gl.uniform1f(u.uSoftness, sunlight.softness / 100);
    gl.uniform1f(u.uTemperature, sunlight.temperature / 100);
    gl.uniform1i(u.uHasOverlay, overlayTexture ? 1 : 0);
    if (overlayTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
      gl.uniform1i(u.uOverlay, 0);
    }
    gl.bindVertexArray(this.triVao);
    gl.blendFuncSeparate(
      gl.ONE,
      gl.ONE_MINUS_SRC_COLOR,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.uniform1i(u.uMode, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);
    gl.uniform1i(u.uMode, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawGrain(scene: Scene) {
    const gl = this.gl;
    const program = this.grainProgram;
    if (!gl || !program) return;
    if (scene.sunlight.grain <= 0) return;
    gl.useProgram(program.program);
    gl.uniform1f(program.uniforms.uAmount, (scene.sunlight.grain / 100) * 0.25);
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawWatermark(scene: Scene, scale: number) {
    const gl = this.gl;
    const program = this.watermarkProgram;
    const canvas = this.canvas;
    if (!gl || !program || !canvas) return;
    if (!scene.watermark) return;
    const texture = this.getTexture("watermark");
    const size = this.watermarkSize;
    if (!texture || !size) return;

    const placement =
      this.assets.watermarkPlacement ?? DEFAULT_WATERMARK_PLACEMENT;
    const opacity = clampWatermarkOpacity(placement.opacity);
    if (opacity <= 0) return;
    const rect = watermarkRect(
      canvas.width,
      canvas.height,
      scale,
      size.width / size.height,
      placement,
    );

    gl.useProgram(program.program);
    const u = program.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform4f(u.uRect, rect.x, rect.y, rect.width, rect.height);
    gl.uniform1f(u.uOpacity, opacity);
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
