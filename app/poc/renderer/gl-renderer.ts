import { POC_SCENE } from "./poc-scene";

export type RenderMode = {
  background: "gradient" | "video";
  glass: boolean;
  tilt: boolean;
};

const GRID = 24;

const VS = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SDF = `
float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}`;

const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uAngle;
uniform int uUseTex;
uniform sampler2D uTex;
uniform vec2 uTexScale;
void main() {
  vec3 col;
  if (uUseTex == 1) {
    vec2 uv = (vUv - 0.5) * uTexScale + 0.5;
    col = texture(uTex, uv).rgb;
  } else {
    float rad = radians(uAngle);
    vec2 dir = vec2(cos(rad), sin(rad));
    float t = clamp(dot(vUv - 0.5, dir) + 0.5, 0.0, 1.0);
    col = mix(uFrom, uTo, t);
  }
  outColor = vec4(col, 1.0);
}`;

const SHADOW_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uRadius;
uniform float uSpread;
uniform float uAlpha;
out vec4 outColor;
${SDF}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = uRect.xy + uRect.zw * 0.5;
  float d = sdRoundRect(p - c, uRect.zw * 0.5, uRadius);
  float a = uAlpha * (1.0 - smoothstep(0.0, uSpread, max(d, 0.0)));
  outColor = vec4(0.02, 0.02, 0.06, a);
}`;

const GLASS_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uRect;
uniform float uRadius;
uniform float uTint;
out vec4 outColor;
${SDF}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = uRect.xy + uRect.zw * 0.5;
  float d = sdRoundRect(p - c, uRect.zw * 0.5, uRadius);
  float mask = 1.0 - smoothstep(-1.0, 1.0, d);
  vec3 col = texture(uTex, gl_FragCoord.xy / uRes).rgb;
  col = mix(col, vec3(1.0), uTint);
  float edge = 1.0 - smoothstep(0.0, 1.5, abs(d + 0.5));
  col += edge * 0.3;
  outColor = vec4(col, mask * 0.94);
}`;

const IMAGE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uRadius;
${SDF}
void main() {
  vec2 p = vUv * uSize;
  float d = sdRoundRect(p - uSize * 0.5, uSize * 0.5, uRadius);
  float mask = 1.0 - smoothstep(-0.75, 0.75, d);
  vec4 col = texture(uTex, vUv);
  outColor = vec4(col.rgb, col.a * mask);
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

type Prog = {
  program: WebGLProgram;
  u: Record<string, WebGLUniformLocation>;
};

function createProgram(gl: WebGL2RenderingContext, fsSrc: string): Prog {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) throw new Error("shader alloc failed");
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error("shader compile failed: " + gl.getShaderInfoLog(sh));
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("program alloc failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aUv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("program link failed: " + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  const u: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const loc = gl.getUniformLocation(program, info.name);
    if (loc) u[info.name] = loc;
  }
  return { program, u };
}

function squareToQuad(q: [number, number][]): number[] {
  const [p0, p1, p2, p3] = q;
  const sx = p0[0] - p1[0] + p2[0] - p3[0];
  const sy = p0[1] - p1[1] + p2[1] - p3[1];
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return [
      p1[0] - p0[0], p3[0] - p0[0], p0[0],
      p1[1] - p0[1], p3[1] - p0[1], p0[1],
      0, 0,
    ];
  }
  const dx1 = p1[0] - p2[0];
  const dx2 = p3[0] - p2[0];
  const dy1 = p1[1] - p2[1];
  const dy2 = p3[1] - p2[1];
  const den = dx1 * dy2 - dy1 * dx2;
  const g = (sx * dy2 - sy * dx2) / den;
  const h = (dx1 * sy - dy1 * sx) / den;
  return [
    p1[0] - p0[0] + g * p1[0], p3[0] - p0[0] + h * p3[0], p0[0],
    p1[1] - p0[1] + g * p1[1], p3[1] - p0[1] + h * p3[1], p0[1],
    g, h,
  ];
}

export class GlPocRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private bg: Prog;
  private shadow: Prog;
  private glass: Prog;
  private image: Prog;
  private blur: Prog;
  private triVao: WebGLVertexArrayObject;
  private meshVao: WebGLVertexArrayObject;
  private meshPosBuf: WebGLBuffer;
  private meshPositions: Float32Array;
  private shotTex: WebGLTexture;
  private videoTex: WebGLTexture;
  private fboA: { fbo: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  private fboB: { fbo: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  private fboW = 0;
  private fboH = 0;
  private videoAR: number | null = null;
  hasVideoFrame = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 context not available");
    this.gl = gl;

    this.bg = createProgram(gl, BG_FS);
    this.shadow = createProgram(gl, SHADOW_FS);
    this.glass = createProgram(gl, GLASS_FS);
    this.image = createProgram(gl, IMAGE_FS);
    this.blur = createProgram(gl, BLUR_FS);

    const triData = new Float32Array([
      -1, -1, 0, 0,
      3, -1, 2, 0,
      -1, 3, 0, 2,
    ]);
    const triBuf = gl.createBuffer();
    const triVao = gl.createVertexArray();
    if (!triBuf || !triVao) throw new Error("triangle buffers failed");
    gl.bindVertexArray(triVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
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
    const idxBuf = gl.createBuffer();
    const meshVao = gl.createVertexArray();
    if (!posBuf || !uvBuf || !idxBuf || !meshVao) throw new Error("mesh buffers failed");
    gl.bindVertexArray(meshVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, (GRID + 1) * (GRID + 1) * 2 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxData, gl.STATIC_DRAW);
    this.meshVao = meshVao;
    this.meshPosBuf = posBuf;
    this.meshPositions = new Float32Array((GRID + 1) * (GRID + 1) * 2);

    this.shotTex = this.createTex();
    this.videoTex = this.createTex();
  }

  private createTex(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("texture alloc failed");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private upload(tex: WebGLTexture, source: TexImageSource) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  setScreenshot(source: TexImageSource) {
    this.upload(this.shotTex, source);
  }

  setVideoFrame(source: TexImageSource, aspectRatio?: number) {
    this.upload(this.videoTex, source);
    if (aspectRatio) this.videoAR = aspectRatio;
    this.hasVideoFrame = true;
  }

  private ensureFbos(w: number, h: number) {
    const gl = this.gl;
    if (this.fboA && this.fboB && this.fboW === w && this.fboH === h) return;
    const make = () => {
      const tex = this.createTex();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fbo = gl.createFramebuffer();
      if (!fbo) throw new Error("fbo alloc failed");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) throw new Error("fbo incomplete");
      return { fbo, tex };
    };
    this.fboA = make();
    this.fboB = make();
    this.fboW = w;
    this.fboH = h;
  }

  private drawBgQuad(W: number, H: number, mode: RenderMode) {
    const gl = this.gl;
    const p = this.bg;
    gl.useProgram(p.program);
    const g = POC_SCENE.gradient;
    gl.uniform3f(p.u.uFrom, g.from[0] / 255, g.from[1] / 255, g.from[2] / 255);
    gl.uniform3f(p.u.uTo, g.to[0] / 255, g.to[1] / 255, g.to[2] / 255);
    gl.uniform1f(p.u.uAngle, g.angle);
    if (mode.background === "video" && this.hasVideoFrame) {
      gl.uniform1i(p.u.uUseTex, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
      gl.uniform1i(p.u.uTex, 0);
      const canvasAR = W / H;
      const videoAR = this.videoAR ?? canvasAR;
      let sx = 1;
      let sy = 1;
      if (videoAR > canvasAR) sx = canvasAR / videoAR;
      else sy = videoAR / canvasAR;
      gl.uniform2f(p.u.uTexScale, sx, sy);
    } else {
      gl.uniform1i(p.u.uUseTex, 0);
    }
    gl.bindVertexArray(this.triVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render(scale: number, mode: RenderMode) {
    const gl = this.gl;
    const W = Math.round(POC_SCENE.baseW * scale);
    const H = Math.round(POC_SCENE.baseH * scale);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    gl.viewport(0, 0, W, H);

    if (mode.glass) {
      const fw = Math.max(2, Math.floor(W / 2));
      const fh = Math.max(2, Math.floor(H / 2));
      this.ensureFbos(fw, fh);
      if (this.fboA && this.fboB) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fbo);
        gl.viewport(0, 0, fw, fh);
        this.drawBgQuad(W, H, mode);
        gl.useProgram(this.blur.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
        gl.uniform1i(this.blur.u.uTex, 0);
        gl.uniform2f(this.blur.u.uDir, 2 / fw, 0);
        gl.bindVertexArray(this.triVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.fboB.tex);
        gl.uniform2f(this.blur.u.uDir, 0, 2 / fh);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
      }
    }

    gl.disable(gl.BLEND);
    this.drawBgQuad(W, H, mode);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const card = POC_SCENE.card;
    const cardW = card.w * scale;
    const cardH = card.h * scale;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    {
      const p = this.shadow;
      gl.useProgram(p.program);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform4f(p.u.uRect, cardX, cardY + card.shadowOffsetY * scale, cardW, cardH);
      gl.uniform1f(p.u.uRadius, card.radius * scale);
      gl.uniform1f(p.u.uSpread, card.shadowSpread * scale);
      gl.uniform1f(p.u.uAlpha, card.shadowAlpha);
      gl.bindVertexArray(this.triVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (mode.glass && this.fboA) {
      const p = this.glass;
      const pad = 30 * scale;
      gl.useProgram(p.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
      gl.uniform1i(p.u.uTex, 0);
      gl.uniform2f(p.u.uRes, W, H);
      gl.uniform4f(p.u.uRect, cardX - pad, cardY - pad, cardW + pad * 2, cardH + pad * 2);
      gl.uniform1f(p.u.uRadius, (card.radius + pad * 0.6));
      gl.uniform1f(p.u.uTint, POC_SCENE.glassTint);
      gl.bindVertexArray(this.triVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    {
      const p = this.image;
      gl.useProgram(p.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shotTex);
      gl.uniform1i(p.u.uTex, 0);
      gl.uniform2f(p.u.uSize, card.w, card.h);
      gl.uniform1f(p.u.uRadius, card.radius);

      const hw = cardW / 2;
      const hh = cardH / 2;
      const cx = W / 2;
      const cy = H / 2;
      const rx = (mode.tilt ? POC_SCENE.tilt.x : 0) * (Math.PI / 180);
      const ry = (mode.tilt ? POC_SCENE.tilt.y : 0) * (Math.PI / 180);
      const f = POC_SCENE.tilt.cameraDist * scale;
      const cosy = Math.cos(ry);
      const siny = Math.sin(ry);
      const cosx = Math.cos(rx);
      const sinx = Math.sin(rx);
      const proj = (x: number, y: number): [number, number] => {
        const x1 = x * cosy;
        const z1 = -x * siny;
        const y2 = y * cosx - z1 * sinx;
        const z2 = y * sinx + z1 * cosx;
        const k = f / (f - z2);
        return [cx + x1 * k, cy + y2 * k];
      };
      const Hm = squareToQuad([
        proj(-hw, -hh),
        proj(hw, -hh),
        proj(hw, hh),
        proj(-hw, hh),
      ]);
      const pos = this.meshPositions;
      for (let j = 0; j <= GRID; j++) {
        for (let i = 0; i <= GRID; i++) {
          const u = i / GRID;
          const v = j / GRID;
          const den = Hm[6] * u + Hm[7] * v + 1;
          const px = (Hm[0] * u + Hm[1] * v + Hm[2]) / den;
          const py = (Hm[3] * u + Hm[4] * v + Hm[5]) / den;
          const k = (j * (GRID + 1) + i) * 2;
          pos[k] = (px / W) * 2 - 1;
          pos[k + 1] = 1 - (py / H) * 2;
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.meshPosBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.bindVertexArray(this.meshVao);
      gl.drawElements(gl.TRIANGLES, GRID * GRID * 6, gl.UNSIGNED_SHORT, 0);
    }
  }

  async renderToBlob(
    scale: number,
    mode: RenderMode
  ): Promise<{ blob: Blob; ms: number; width: number; height: number }> {
    const t0 = performance.now();
    this.render(scale, mode);
    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        this.canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("canvas.toBlob returned null"));
        }, "image/png");
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    return {
      blob,
      ms: performance.now() - t0,
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}
