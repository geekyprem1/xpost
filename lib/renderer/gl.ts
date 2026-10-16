export const QUAD_VS = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const ROUND_RECT_SDF = `
float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}`;

export type GlProgram = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
};

export function createGlProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): GlProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to allocate a shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error("Shader compile fail: " + gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, QUAD_VS);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate a graphics program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.bindAttribLocation(program, 1, "aUv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Program link fail: " + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const location = gl.getUniformLocation(program, info.name);
    if (location) {
      const name = info.name.endsWith("[0]")
        ? info.name.slice(0, info.name.length - 3)
        : info.name;
      uniforms[name] = location;
    }
  }
  return { program, uniforms };
}

export function createGlTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error("Unable to allocate a texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export function uploadGlTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  source: TexImageSource,
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

export type GlFbo = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
};

export function createGlFbo(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): GlFbo {
  const texture = createGlTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error("Unable to allocate a framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  const complete =
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) throw new Error("The framebuffer is incomplete");
  return { framebuffer, texture };
}

export function deleteGlFbo(gl: WebGL2RenderingContext, fbo: GlFbo) {
  gl.deleteFramebuffer(fbo.framebuffer);
  gl.deleteTexture(fbo.texture);
}

export function squareToQuad(quad: [number, number][]): number[] {
  const [p0, p1, p2, p3] = quad;
  const sx = p0[0] - p1[0] + p2[0] - p3[0];
  const sy = p0[1] - p1[1] + p2[1] - p3[1];
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return [
      p1[0] - p0[0],
      p3[0] - p0[0],
      p0[0],
      p1[1] - p0[1],
      p3[1] - p0[1],
      p0[1],
      0,
      0,
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
    p1[0] - p0[0] + g * p1[0],
    p3[0] - p0[0] + h * p3[0],
    p0[0],
    p1[1] - p0[1] + g * p1[1],
    p3[1] - p0[1] + h * p3[1],
    p0[1],
    g,
    h,
  ];
}
