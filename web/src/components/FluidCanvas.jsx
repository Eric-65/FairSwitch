import { useEffect, useRef, useState } from 'react';
import './FluidCanvas.css';

// Domain-warped fbm noise mapped onto an aqua palette. ~40 lines of GLSL, no textures.
const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*n(p); p=p*2.02+vec2(1.7,9.2); a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy; vec2 p = uv * vec2(uRes.x/uRes.y, 1.) * 1.6;
  float t = uTime * .045;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p + 3.5*q + vec2(1.7,9.2) + t*1.3), fbm(p + 3.5*q + vec2(8.3,2.8) - t));
  float f = fbm(p + 3.*r);
  vec3 col = mix(uA, uB, smoothstep(.15, .65, f));
  col = mix(col, uC, smoothstep(.55, .95, length(q) * f));
  col = mix(col, uD, smoothstep(.72, 1., r.x * f * 1.4) * .55);
  float vig = smoothstep(1.25, .35, length(uv - .5));
  gl_FragColor = vec4(col * (.82 + .18 * vig), 1.);
}`;
const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';

const PALETTES = {
  hero: ['#076f97', '#12b3d6', '#b9eef0', '#2ec9c4'],
  collage: ['#0f9aa8', '#2ec9c4', '#f1efe6', '#f3c9a6'],
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export default function FluidCanvas({ variant = 'hero', className = '' }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
    if (!gl) { setFailed(true); return; }
    // Software rasterisers (SwiftShader, llvmpipe) would burn the main thread: use the CSS fallback.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) { setFailed(true); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFailed(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (k) => gl.getUniformLocation(prog, k);
    const [A, B, C, D] = PALETTES[variant].map(rgb);
    gl.uniform3fv(u('uA'), A); gl.uniform3fv(u('uB'), B); gl.uniform3fv(u('uC'), C); gl.uniform3fv(u('uD'), D);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.4; // soft by design, cheap to render
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(u('uRes'), w, h);
    };
    const draw = (t) => { resize(); gl.uniform1f(u('uTime'), t); gl.drawArrays(gl.TRIANGLES, 0, 3); };

    let raf = 0; let last = 0; let visible = true; const t0 = performance.now() - 20000;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 33) return; // ~30 fps cap
      last = now; draw((now - t0) / 1000);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    const ro = new ResizeObserver(() => draw((performance.now() - t0) / 1000));
    let idle = 0;
    // Start after load + idle so the shader never competes with first paint / hydration.
    const start = () => {
      draw(20);
      canvas.classList.add('is-ready');
      io.observe(canvas); ro.observe(canvas);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    const schedule = () => { idle = (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(start, { timeout: 2500 }); };
    if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule, { once: true });
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener('load', schedule);
      (window.cancelIdleCallback || clearTimeout)(idle);
    };
  }, [variant]);

  return (
    <div className={`fluid fluid--${variant} ${className}`} aria-hidden="true">
      {!failed && <canvas ref={ref} className="fluid__canvas" />}
      <div className={`fluid__fallback ${failed ? 'is-on' : ''}`} />
    </div>
  );
}
