// GLIMMERDEEP — WebGL2 lighting compositor.
// Inputs per frame: albedo canvas, emissive canvas, tile solidity texture, a light list and the lamp.
// Output: dithered, banded pixel lighting + lamp shadows + volumetric beam haze + emissive bloom + sonar outlines.
'use strict';
const MAX_LIGHTS = 40;
const Renderer = {
  init(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'default' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl; this.canvas = canvas;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; console.warn('GL context lost'); });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.init(canvas); if (this.solidData) this.setSolid(this.solidData, this.solidW, this.solidH); });
    const vs = `#version 300 es
      in vec2 p; out vec2 uv; void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.,1.); }`;
    const fs = `#version 300 es
      precision highp float;
      in vec2 uv; out vec4 o;
      uniform sampler2D uScene, uEmit, uSolid;
      uniform vec2 uRes, uCam, uMap;
      uniform float uTime, uAmbient, uSun, uFade, uHurt, uDark, uWobble, uSurfaceY;
      uniform vec3 uAmbCol;
      uniform vec4 uL[${MAX_LIGHTS}]; uniform vec3 uLC[${MAX_LIGHTS}]; uniform int uN;
      uniform vec4 uLamp; uniform vec3 uLampCol; uniform vec2 uLampDir; uniform float uLampCos;
      uniform vec4 uPing;
      float bayer(vec2 p){ ivec2 i = ivec2(mod(p,4.)); int b[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return (float(b[i.y*4+i.x])+.5)/16.; }
      float solidAt(vec2 w){ vec2 t = floor(w/16.); if(t.x<0.||t.y<0.||t.x>=uMap.x||t.y>=uMap.y) return 1.; return texture(uSolid,(t+.5)/uMap).r; }
      float shadow(vec2 w, vec2 L){
        vec2 d = L - w; float len = length(d); if(len < 6.) return 1.;
        vec2 st = d / len; float s = 1.;
        // skip the first few px so the lit faces of walls stay lit
        for(int i=1;i<=22;i++){ float k = 7. + (len-8.)*float(i)/22.; if(k>len-2.) break; if(solidAt(w+st*k)>.5){ s = 0.; break; } }
        return s;
      }
      void main(){
        vec2 px = floor(uv*uRes);
        vec2 w = px + uCam;
        vec2 suv = uv;
        if(uWobble>0.){ suv.x += sin(px.y*.09+uTime*1.3)*uWobble/uRes.x; }
        vec4 sc = texture(uScene, suv);
        vec3 alb = sc.rgb;
        float inSolid = solidAt(w);
        // ambient: zone ambience + sunlight falling from the surface with caustics
        float depthPx = max(0., w.y - uSurfaceY);
        float sun = uSun * exp(-depthPx/400.);
        float depthNorm = clamp(depthPx/(uMap.y*16.), 0., 1.);
        float amb = uAmbient * mix(1.25, 0.85, depthNorm);   // fade into a zone rather than off a cliff
        float caus = 0., ray = 0.;
        if(sun>0.005){
          vec2 q = w*.045; caus = sin(q.x*1.7+uTime*.9+sin(q.y*1.3+uTime*.7))*sin(q.y*1.9-uTime*.6+sin(q.x*1.1)); caus = smoothstep(.55,.95,caus);
          // slanted god-ray shafts (idea credit: Gilded Cog's Vex)
          float sc = (w.x - w.y*.38)*.055;
          ray = smoothstep(.45,.96, sin(sc+uTime*.45)*.6 + sin(sc*2.3-uTime*.28)*.4) * (1.-inSolid) * exp(-depthPx/1100.);
        }
        vec3 L = uAmbCol*amb + vec3(.75,.9,1.)*sun*(.8+.5*caus*(1.-inSolid));
        vec3 haze = vec3(.45,.82,.78)*ray*max(uSun*.9, amb*.6)*.3;
        for(int i=0;i<${MAX_LIGHTS};i++){ if(i>=uN) break;
          vec2 d = w - uL[i].xy; float q = 1. - dot(d,d)/(uL[i].z*uL[i].z);
          if(q>0.){ float f = q*q*uL[i].w; L += uLC[i]*f; haze += uLC[i]*f*.07; }
        }
        // the Wick's lamp: halo + cone, shadowed by rock
        if(uLamp.w>0.){
          vec2 d = w - uLamp.xy; float dist = length(d);
          float q = 1. - (dist*dist)/(uLamp.z*uLamp.z);
          if(q>0.){
            float cone = uLampCos < -.5 ? 1. : smoothstep(uLampCos-.12, uLampCos+.08, dot(d/max(dist,.001), uLampDir));
            float halo = clamp(1. - dist/max(30., uLamp.z*.6), 0., 1.);
            float f = max(q*q*cone, halo*halo*.55)*uLamp.w;
            float sh = f>0.01 ? shadow(w, uLamp.xy) : 1.;
            L += uLampCol*f*sh;
            haze += uLampCol*f*sh*(1.-inSolid)*.16*(0.6+0.4*sin(w.x*.05+w.y*.03+uTime*.8));
          }
        }
        // banded, dithered light — the pixel-art look
        float b = bayer(px);
        L = floor(L*7. + b)/7.;
        vec3 col = alb*L + haze;
        // emissive + bloom
        vec4 em = texture(uEmit, uv);
        vec3 bloom = vec3(0.);
        const int TAPS = 12;
        for(int i=0;i<TAPS;i++){ float a = float(i)*2.39996; float r = 2.5 + float(i)*0.9; vec2 o = vec2(cos(a),sin(a))*r/uRes; vec4 e = texture(uEmit, uv+o); bloom += e.rgb*e.a*(1.2 - float(i)/float(TAPS)); }
        bloom /= float(TAPS);
        col = col*(1.-em.a) + em.rgb*em.a + bloom*.9;
        // sonar: outline rock edges that the ring has passed
        if(uPing.w>0.){
          float e = 0.;
          if(inSolid>.5){ e = max(max(1.-solidAt(w+vec2(2,0)),1.-solidAt(w-vec2(2,0))),max(1.-solidAt(w+vec2(0,2)),1.-solidAt(w-vec2(0,2)))); }
          float dd = length(w-uPing.xy);
          float front = smoothstep(18.,0.,abs(dd-uPing.z));
          float passed = step(dd, uPing.z);
          col += vec3(.37,.88,.78)*e*(passed*.55 + front)*uPing.w;
          if(inSolid<.5) col += vec3(.37,.88,.78)*front*.12*uPing.w;
        }
        // lamp-out vignette, hurt flash, fade
        vec2 c = uv-.5; float vig = dot(c,c);
        col *= 1. - vig*.55;
        if(uDark>0.) col *= mix(1., smoothstep(.02+.28*(1.-uDark), .0, vig), uDark);
        col = mix(col, vec3(.8,.15,.2), uHurt*.35*(.4+vig*2.));
        col *= 1.-uFade;
        o = vec4(col,1.);
      }`;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.pr = pr; gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const n of ['uScene', 'uEmit', 'uSolid', 'uRes', 'uCam', 'uMap', 'uTime', 'uAmbient', 'uSun', 'uFade', 'uHurt', 'uDark', 'uWobble', 'uSurfaceY', 'uAmbCol', 'uL', 'uLC', 'uN', 'uLamp', 'uLampCol', 'uLampDir', 'uLampCos', 'uPing']) this.u[n] = gl.getUniformLocation(pr, n);
    const tex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    this.tScene = tex(0); this.tEmit = tex(1); this.tSolid = tex(2);
    // the emissive texture is sampled with offsets for bloom; linear filtering softens it nicely
    gl.activeTexture(gl.TEXTURE1); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.u.uScene, 0); gl.uniform1i(this.u.uEmit, 1); gl.uniform1i(this.u.uSolid, 2);
    gl.uniform2f(this.u.uRes, VW, VH);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.lb = new Float32Array(MAX_LIGHTS * 4); this.lc = new Float32Array(MAX_LIGHTS * 3);
  },
  setSolid(data, w, h) {
    this.solidData = data; this.solidW = w; this.solidH = h;
    const gl = this.gl; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tSolid);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    gl.uniform2f(this.u.uMap, w, h);
  },
  draw(scene, emit, f) {
    if (this.lost) return;
    const gl = this.gl, u = this.u;
    gl.viewport(0, 0, VW, VH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tScene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tEmit); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emit);
    gl.uniform2f(u.uCam, f.camX, f.camY); gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uAmbient, f.ambient); gl.uniform3fv(u.uAmbCol, f.ambCol); gl.uniform1f(u.uSun, f.sun); gl.uniform1f(u.uSurfaceY, f.surfaceY);
    gl.uniform1f(u.uFade, f.fade); gl.uniform1f(u.uHurt, f.hurt); gl.uniform1f(u.uDark, f.dark); gl.uniform1f(u.uWobble, f.wobble);
    const n = Math.min(MAX_LIGHTS, f.lights.length);
    for (let i = 0; i < n; i++) { const l = f.lights[i]; this.lb.set([l.x, l.y, l.r, l.s], i * 4); this.lc.set(l.c, i * 3); }
    gl.uniform4fv(u.uL, this.lb); gl.uniform3fv(u.uLC, this.lc); gl.uniform1i(u.uN, n);
    const L = f.lamp; gl.uniform4f(u.uLamp, L.x, L.y, L.r, L.s); gl.uniform3fv(u.uLampCol, L.c); gl.uniform2f(u.uLampDir, L.dx, L.dy); gl.uniform1f(u.uLampCos, L.cos);
    gl.uniform4f(u.uPing, f.ping.x, f.ping.y, f.ping.r, f.ping.a);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
};
