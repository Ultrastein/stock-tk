/**
 * shader-bg.js
 * Fullscreen interactive WebGL background for the app.
 * Listens to document-level mouse/click events so it works
 * even when positioned behind the UI (z-index: -1, pointer-events: none).
 *
 * 5 shaders available. Default: Plasma Void.
 * Change via window.shaderBg.setShader(0..4)
 */
(function () {
  'use strict';

  // ── Vertex shader (shared) ──────────────────────────────────────────
  const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

  // ── Fragment shaders ────────────────────────────────────────────────

  /** 1. PLASMA VOID — double domain-warped FBM. Mouse warps the plasma.
   *     Clicks launch expanding shockwave ripples. */
  const FRAG_PLASMA = `
precision highp float;
uniform vec2  u_res, u_mouse;
uniform float u_time;
uniform vec2  u_clicks[8];
uniform float u_ctimes[8];
uniform int   u_nclicks;

vec2  h22(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.0+2.0*fract(sin(p)*43758.5453); }
float n(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(dot(h22(i),f),dot(h22(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h22(i+vec2(0,1)),f-vec2(0,1)),dot(h22(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.1+vec2(1.7,9.2); a*=0.5; } return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m  = u_mouse / u_res;
  float t = u_time * 0.42;

  vec2 dm = uv - m;
  float md = length(dm);
  vec2 warp = normalize(dm + 0.001) * 0.32 * exp(-md * 2.9);

  vec2 p = uv * 2.7 + vec2(t * 0.06) - warp;
  vec2 q = vec2(fbm(p + t*0.05), fbm(p + vec2(5.2,1.3) + t*0.04));
  vec2 r = vec2(fbm(p + q + vec2(1.7,9.2) + t*0.03), fbm(p + q + vec2(8.3,2.8) + t*0.03));
  float f = fbm(p + r);

  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    float dd  = length(uv - u_clicks[i]/u_res);
    f += sin((dd - age*0.42)*28.0) * exp(-age*1.6) * exp(-dd*8.5) * 0.26;
  }
  f = f*0.5 + 0.5;

  // Dark navy → indigo → cyan — stays subtle behind UI
  vec3 c0 = vec3(0.059, 0.090, 0.165);
  vec3 c1 = vec3(0.122, 0.145, 0.310);
  vec3 c2 = vec3(0.267, 0.286, 0.624);
  vec3 c3 = vec3(0.055, 0.647, 0.914);
  vec3 c4 = vec3(0.55,  0.75,  0.96);

  vec3 col = mix(c0, c1, smoothstep(0.0,  0.30, f));
  col = mix(col, c2, smoothstep(0.30, 0.58, f));
  col = mix(col, c3, smoothstep(0.58, 0.80, f));
  col = mix(col, c4, smoothstep(0.80, 1.00, f));
  col = pow(col, vec3(1.05));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /** 2. NEURAL LATTICE — hex grid with animated node glow. Mouse creates
   *     continuous pulse waves. Clicks dispatch signal bursts. */
  const FRAG_NEURAL = `
precision highp float;
uniform vec2  u_res, u_mouse;
uniform float u_time;
uniform vec2  u_clicks[8];
uniform float u_ctimes[8];
uniform int   u_nclicks;

float h1(float n){ return fract(sin(n)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec2 hexOff(vec2 p){ vec2 a=mod(p,vec2(1.0,1.732))-vec2(0.5,0.866); vec2 b=mod(p-vec2(0.5,0.866),vec2(1.0,1.732))-vec2(0.5,0.866); return dot(a,a)<dot(b,b)?a:b; }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p  = (uv*2.0-1.0)*vec2(u_res.x/u_res.y,1.0);
  vec2 m  = (u_mouse/u_res*2.0-1.0)*vec2(u_res.x/u_res.y,1.0);
  float t = u_time * 0.65;

  float sc = 5.2;
  vec2 gp = p * sc;
  vec2 ho = hexOff(gp);
  float hd = max(abs(ho.x), abs(ho.x*0.5+ho.y*0.866));
  float ph = h2(floor(gp - ho));

  float mdist = length(p - m);
  float mpulse = sin(t*2.5 - mdist*7.0)*0.5 + 0.5;

  float edge = 1.0 - smoothstep(0.42, 0.50, hd);
  float node = exp(-dot(ho,ho)*65.0);
  float cellAnim = 0.4 + 0.6*(sin(t*1.8+ph*6.28)*0.5+0.5);

  float wave = 0.0;
  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    vec2 cp = (u_clicks[i]/u_res*2.0-1.0)*vec2(u_res.x/u_res.y,1.0);
    float dd = length(p - cp);
    wave += sin((dd - age*1.5)*18.0)*exp(-age*2.0)*exp(-dd*2.5)*0.5 + 0.5;
  }
  wave = clamp(wave, 0.0, 1.0);

  vec3 bg    = vec3(0.030, 0.050, 0.110);
  vec3 edgeC = mix(vec3(0.267,0.286,0.624), vec3(0.055,0.647,0.914), mpulse);
  vec3 nodeC = vec3(0.75, 0.90, 1.0);

  vec3 col = bg;
  col += edgeC * edge * 1.3 * cellAnim;
  col += nodeC * node * 1.4;
  col += edgeC * wave * 0.5;
  col += edgeC * exp(-mdist*5.5) * 0.22;
  col = 1.0 - exp(-col * 2.1);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /** 3. LIQUID CHROME — metallic sine-wave interference. Mouse creates
   *     ripples. Clicks launch expanding splash rings. */
  const FRAG_LIQUID = `
precision highp float;
uniform vec2  u_res, u_mouse;
uniform float u_time;
uniform vec2  u_clicks[8];
uniform float u_ctimes[8];
uniform int   u_nclicks;

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m  = u_mouse / u_res;
  float t = u_time * 0.5;
  float freq = 3.2;

  float md = length(uv - m);
  float mwave = sin(md*freq*14.0 - t*3.5) * exp(-md*3.2) * 0.055;

  float splash = 0.0;
  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    float dd  = length(uv - u_clicks[i]/u_res);
    splash += exp(-pow(dd - age*0.38, 2.0)*95.0) * exp(-age*1.3);
  }

  float dx = uv.x + mwave + splash*0.04;
  float dy = uv.y + mwave*0.8 + splash*0.03;
  float dr = length(uv - vec2(0.5)) + mwave*0.5;

  float w1 = sin(dx*freq + t)*0.5 + 0.5;
  float w2 = sin(dy*freq*1.37 + t*1.12 + 2.09)*0.5 + 0.5;
  float w3 = sin(dr*freq*0.85 - t*0.65)*0.5 + 0.5;
  float spec = pow(w1*w2*w2*w3, 4.0)*2.0;

  vec3 dark   = vec3(0.04, 0.05, 0.12);
  vec3 indigo = vec3(0.267, 0.286, 0.624);
  vec3 cyan   = vec3(0.055, 0.647, 0.914);
  vec3 silver = vec3(0.70, 0.78, 0.94);

  vec3 col = mix(dark, indigo, w1*w2);
  col = mix(col, cyan, w2*w3*0.65);
  col = mix(col, silver, spec);
  col += vec3(0.08, 0.14, 0.32) * splash * 1.8;
  col = 1.0 - exp(-col * 1.9);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /** 4. AURORA DRIFT — FBM-warped horizontal aurora bands. Mouse Y shifts
   *     the horizon. Clicks burst light columns upward. */
  const FRAG_AURORA = `
precision highp float;
uniform vec2  u_res, u_mouse;
uniform float u_time;
uniform vec2  u_clicks[8];
uniform float u_ctimes[8];
uniform int   u_nclicks;

float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float sn(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y); }
float fbm2(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){v+=a*sn(p);p=p*2.0+vec2(3.1,1.7);a*=0.5;} return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m  = u_mouse / u_res;
  float t = u_time * 0.38;

  float shift = (m.y - 0.5) * 0.42;
  float nx = fbm2(vec2(uv.x*1.8 + t*0.22, t*0.07));
  float band = uv.y - 0.5 + shift + nx*0.26;

  float aurora = 0.0;
  for(float i=0.0; i<6.0; i++){
    float y  = (i/6.0)*0.7 - 0.35;
    float bw = 0.038 + 0.018*sn(vec2(i*3.7+0.5, t*0.14));
    float b  = exp(-pow(band-y, 2.0)/(bw*bw));
    aurora += b * (0.5 + 0.5*sin(t*1.6 + i*1.4 + uv.x*2.8));
  }

  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    vec2 cp = u_clicks[i]/u_res;
    float dx = abs(uv.x - cp.x);
    float dy = uv.y - cp.y;
    aurora += exp(-dx*dx*65.0) * exp(-max(0.0,-dy)*4.0) * exp(-age*1.7) * 3.2;
  }

  aurora += exp(-pow(uv.x-m.x,2.0)*20.0) * exp(-pow(uv.y-m.y,2.0)*6.5) * 1.6;

  vec3 bg     = vec3(0.02, 0.04, 0.09);
  vec3 violet = vec3(0.267, 0.286, 0.624);
  vec3 teal   = vec3(0.04, 0.72, 0.60);
  vec3 cyan   = vec3(0.055, 0.647, 0.914);
  vec3 white  = vec3(0.78, 0.92, 1.0);

  float a = aurora * 1.15;
  vec3 col = bg;
  col += violet * smoothstep(0.0, 0.8, a) * 0.7;
  col += teal   * smoothstep(0.5, 1.8, a) * 0.8;
  col += cyan   * smoothstep(1.2, 2.5, a) * 0.55;
  col += white  * smoothstep(2.2, 3.5, a) * 0.4;
  col = 1.0 - exp(-col * 2.1);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /** 5. DATA STORM — scrolling vertical data-stream columns. Mouse creates
   *     a repulsion deflection field. Clicks emit radial EMP shockwaves. */
  const FRAG_DATA = `
precision highp float;
uniform vec2  u_res, u_mouse;
uniform float u_time;
uniform vec2  u_clicks[8];
uniform float u_ctimes[8];
uniform int   u_nclicks;

float h1(float n){ return fract(sin(n)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 m  = u_mouse / u_res;
  float t = u_time * 0.95;

  vec2 toM = uv - m;
  float mDist = length(toM);
  vec2 def = normalize(toM + 0.001) * 0.11 * exp(-mDist*4.5);

  vec2 emp = vec2(0.0);
  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    vec2 cp = u_clicks[i]/u_res;
    vec2 d2 = uv - cp; float dd = length(d2);
    float ring = exp(-pow(dd - age*0.30, 2.0)*60.0) * exp(-age*1.5);
    emp += normalize(d2 + 0.001) * ring * 0.065;
  }

  vec2 uvd = uv + def + emp;
  float density = 1.0;
  float colN = floor(uvd.x * density * 38.0);
  float colH   = h1(colN);
  float colSpd = 0.4 + 0.6*h1(colN+77.0);
  float colBr  = 0.25 + 0.75*h1(colN+153.0);

  float scroll = fract(uvd.y + t*colSpd + colH*6.28);
  float segIdx = floor(scroll*22.0);
  float segPh  = h2(vec2(colN, segIdx));
  float lit    = step(0.55, segPh);

  float glow = fract(scroll*22.0);
  glow = smoothstep(0.0, 0.12, glow) * smoothstep(1.0, 0.55, glow) * lit * colBr;
  float head = exp(-fract(scroll*22.0)*fract(scroll*22.0)*6.0) * lit * colBr;
  float mHL  = exp(-pow(uv.x - m.x, 2.0)*130.0) * 0.55;

  vec3 bg    = vec3(0.02, 0.04, 0.09);
  vec3 stCol = mix(vec3(0.267,0.286,0.624), vec3(0.055,0.647,0.914), h1(colN+210.0));
  vec3 headC = vec3(0.80, 0.94, 1.0);

  vec3 col = bg;
  col += stCol * glow * 0.9;
  col += headC * head * 1.5;
  col += stCol * mHL * 0.4;
  for(int i=0;i<8;i++){
    if(i>=u_nclicks) break;
    float age = u_time - u_ctimes[i];
    float dd  = length(uv - u_clicks[i]/u_res);
    col += headC * exp(-dd*13.0) * exp(-age*2.8) * 1.1;
  }
  col = 1.0 - exp(-col * 2.1);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  // ── Metadata (for external control) ─────────────────────────────────
  const SHADERS = [
    { name: 'Plasma Void',    frag: FRAG_PLASMA  },
    { name: 'Neural Lattice', frag: FRAG_NEURAL  },
    { name: 'Liquid Chrome',  frag: FRAG_LIQUID  },
    { name: 'Aurora Drift',   frag: FRAG_AURORA  },
    { name: 'Data Storm',     frag: FRAG_DATA    },
  ];

  // ── State ─────────────────────────────────────────────────────────────
  const MAX_CLICKS = 8;
  let canvas, gl, quadBuf;
  let programs  = [];   // compiled WebGL programs per shader
  let ulCaches  = [];   // uniform location caches per shader
  let currentIdx = 0;
  let startTime = Date.now();
  let mouseX = 0, mouseY = 0;  // in WebGL coords (Y flipped)
  let clicks = [];              // { x, y, time }
  let animId = null;
  let paused = false;

  // ── Compile helpers ───────────────────────────────────────────────────
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[shader-bg] compile error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function linkProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[shader-bg] link error:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function buildUniformCache(prog) {
    const names = [
      'u_res', 'u_mouse', 'u_time',
      'u_clicks[0]', 'u_ctimes[0]', 'u_nclicks',
    ];
    const c = {};
    names.forEach(n => { c[n] = gl.getUniformLocation(prog, n); });
    return c;
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('shader-bg');
    if (!canvas) { console.warn('[shader-bg] canvas#shader-bg not found'); return; }

    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
      || canvas.getContext('experimental-webgl', { alpha: false });
    if (!gl) { console.warn('[shader-bg] WebGL not supported'); return; }

    // Fullscreen quad
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW);

    // Compile all shaders
    const vs = compileShader(gl.VERTEX_SHADER, VERT);
    SHADERS.forEach((s, i) => {
      const fs = compileShader(gl.FRAGMENT_SHADER, s.frag);
      if (!vs || !fs) { programs[i] = null; return; }
      const prog = linkProgram(vs, fs);
      programs[i] = prog;
      ulCaches[i]  = prog ? buildUniformCache(prog) : {};
    });

    // Resize handling
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Document-level input (canvas is pointer-events:none so we track globally)
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('click',     onClick);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend',  onTouchEnd,  { passive: true });

    // Init mouse to center
    mouseX = canvas.width  / 2;
    mouseY = canvas.height / 2;

    startLoop();
  }

  // ── Resize ────────────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    // Keep mouse coords in the right scale
    mouseX = (mouseX / (canvas.width  / dpr || 1)) * canvas.width;
    mouseY = (mouseY / (canvas.height / dpr || 1)) * canvas.height;
  }

  // ── Input handlers ────────────────────────────────────────────────────
  function toGL(clientX, clientY) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      x: clientX * dpr,
      y: canvas.height - clientY * dpr,
    };
  }

  function onMouseMove(e) {
    const c = toGL(e.clientX, e.clientY);
    mouseX = c.x; mouseY = c.y;
  }

  function onClick(e) {
    const c = toGL(e.clientX, e.clientY);
    const t = (Date.now() - startTime) / 1000;
    clicks.push({ x: c.x, y: c.y, time: t });
    if (clicks.length > MAX_CLICKS) clicks.shift();
  }

  function onTouchMove(e) {
    if (!e.touches[0]) return;
    const c = toGL(e.touches[0].clientX, e.touches[0].clientY);
    mouseX = c.x; mouseY = c.y;
  }

  function onTouchEnd(e) {
    const tc = e.changedTouches[0];
    if (!tc) return;
    const c = toGL(tc.clientX, tc.clientY);
    const t = (Date.now() - startTime) / 1000;
    clicks.push({ x: c.x, y: c.y, time: t });
    if (clicks.length > MAX_CLICKS) clicks.shift();
  }

  // ── Render loop ───────────────────────────────────────────────────────
  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(frame);
  }

  function frame() {
    animId = requestAnimationFrame(frame);
    if (paused || !gl) return;

    const prog = programs[currentIdx];
    if (!prog) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uc = ulCaches[currentIdx];
    const t  = (Date.now() - startTime) / 1000;

    gl.uniform2f(uc['u_res'],   canvas.width, canvas.height);
    gl.uniform2f(uc['u_mouse'], mouseX, mouseY);
    gl.uniform1f(uc['u_time'],  t);

    const cx = new Float32Array(MAX_CLICKS * 2);
    const ct = new Float32Array(MAX_CLICKS);
    clicks.forEach((c, i) => { cx[i*2] = c.x; cx[i*2+1] = c.y; ct[i] = c.time; });
    if (uc['u_clicks[0]']  != null) gl.uniform2fv(uc['u_clicks[0]'],  cx);
    if (uc['u_ctimes[0]']  != null) gl.uniform1fv(uc['u_ctimes[0]'], ct);
    gl.uniform1i(uc['u_nclicks'], clicks.length);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ── Public API ────────────────────────────────────────────────────────
  window.shaderBg = {
    /** Switch shader (0-4) */
    setShader(idx) {
      if (idx >= 0 && idx < SHADERS.length) currentIdx = idx;
    },
    /** Pause / resume animation */
    pause() { paused = true; },
    resume() { paused = false; },
    toggle() { paused = !paused; },
    /** Clear all click effects */
    clearClicks() { clicks = []; },
    /** Current shader names */
    shaders: SHADERS.map(s => s.name),
    /** Get current index */
    get current() { return currentIdx; },
  };

  // ── Boot ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
