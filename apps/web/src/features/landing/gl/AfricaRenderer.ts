import { mapConfig } from "../../../content/landing";
import { createLandMask, type LandMask } from "./mask";
import { fragmentShader, MAX_MARKERS, vertexShader } from "./shaders";

export interface Marker {
  lon: number;
  lat: number;
  offline: boolean;
  /** Phase whose progress reveals the marker: the West Africa zoom or the pan south. */
  phase: "zoom" | "pan";
  /** Progress of that phase (0..1) at which the marker pops in. */
  at: number;
  /** Region it is counted in on the status card. */
  region: "west" | "south" | null;
}

interface Options {
  reducedMotion: boolean;
  /** Called every frame with the smoothed scroll progress (0..1). */
  onFrame?: (progress: number) => void;
}

/** Everything the shader needs to draw one frame of the camera path. */
interface View {
  lon: number;
  lat: number;
  degPerPx: number;
  offX: number;
  offY: number;
  curve: number;
  eq: number;
  africaOnly: number;
  cellMix: number;
  flatGrid: number;
  zoom: number;
  pan: number;
  /** 1 forces every marker visible (closing globe). */
  lit: number;
}

const DEG = 180 / Math.PI;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class AfricaRenderer {
  readonly markers: Marker[];
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private mask: LandMask;
  private markerData = new Float32Array(MAX_MARKERS * 4);
  private raf = 0;
  private running = false;
  private start = performance.now();
  private last = performance.now();
  private target = 0;
  private progress = 0;
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: Options,
  ) {
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL not available");
    this.gl = gl;
    this.program = this.createProgram();
    this.mask = createLandMask();
    this.markers = this.pickMarkers();
    this.setupGeometry();
    this.setupMaskTexture();
    this.resize();
  }

  /** Raw scroll progress of the hero, 0 at the top, 1 at the end. */
  setProgress(p: number) {
    this.target = clamp01(p);
    if (this.opts.reducedMotion) this.progress = this.target;
  }

  play() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.viewport(0, 0, this.width, this.height);
    if (!this.running) this.frame();
  }

  dispose() {
    this.pause();
    // Free our GL objects but keep the context alive: React StrictMode (dev)
    // mounts, disposes and remounts on the same canvas, and a lost context
    // cannot be reused.
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }

  // ---------------------------------------------------------------- frame

  private frame() {
    const gl = this.gl;
    const now = performance.now();
    const time = (now - this.start) / 1000;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;

    // Smooth the scroll so the motion glides instead of stepping with the wheel.
    // Time based, so it feels the same at 30, 60 or 120 fps.
    this.progress += (this.target - this.progress) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(this.target - this.progress) < 0.0001) this.progress = this.target;
    this.opts.onFrame?.(this.progress);

    const view = this.view(this.progress, time);

    this.markers.forEach((m, i) => {
      const t = Math.max(
        view.lit,
        clamp01(((m.phase === "pan" ? view.pan : view.zoom) - m.at) / 0.07),
      );
      const o = i * 4;
      this.markerData[o] = m.lon;
      this.markerData[o + 1] = m.lat;
      this.markerData[o + 2] = m.offline ? 1 : 0;
      this.markerData[o + 3] = t <= 0 ? 0 : this.opts.reducedMotion ? 1 : easeOutBack(t);
    });

    const u = this.uniforms;
    gl.uniform2f(u.uRes, this.width, this.height);
    gl.uniform2f(u.uOffset, view.offX, view.offY);
    gl.uniform2f(u.uCenter, view.lon, view.lat);
    gl.uniform1f(u.uDegPerPx, view.degPerPx);
    gl.uniform1f(u.uCurve, view.curve);
    gl.uniform1f(u.uEq, view.eq);
    gl.uniform1f(u.uAfricaOnly, view.africaOnly);
    gl.uniform1f(u.uCellMix, view.cellMix);
    gl.uniform1f(u.uFlatGrid, view.flatGrid);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uZoom, view.zoom);
    gl.uniform1f(u.uPxScale, this.dpr);
    gl.uniform4fv(u.uMarkers, this.markerData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------------------------------------------------------------- camera path

  /** Scroll progress to view: globe turn, then flattening, then the map zoom. */
  private view(p: number, time: number): View {
    const { rotateEnd, morphEnd, zoomEnd, panStart, panEnd, returnStart, returnEnd } =
      mapConfig.timeline;
    const W = this.width;
    const H = this.height;
    const wide = W / H > 1.15;
    const flat0 = this.flatCamera(0);
    const mid = { lon: flat0.lon, lat: flat0.lat };

    // Globe radius at the start (beside the headline) and once Africa faces us.
    const r0 = wide ? 0.43 * H : Math.min(0.44 * W, 0.3 * H);
    const r1 = wide ? 0.42 * H : 0.44 * W;
    const off0 = wide ? { x: 0.2 * W, y: 0 } : { x: 0, y: -0.16 * H };

    if (p >= returnStart)
      return this.returnView((p - returnStart) / (returnEnd - returnStart), time, {
        mid,
        flat0,
        r0,
        r1,
        off0,
      });

    if (p < rotateEnd) {
      const t = easeInOutCubic(p / rotateEnd);
      // The globe turns in place beside the text, then slides to the center
      // only in the last 30% of the turn, once the first section has faded.
      const slide = easeInOutCubic(clamp01((p / rotateEnd - 0.7) / 0.3));
      const idle = this.opts.reducedMotion ? 0 : 7 * Math.sin(time * 0.12) * (1 - t);
      return {
        lon: lerp(mapConfig.globeStart.lon, mid.lon, t) + idle,
        lat: lerp(mapConfig.globeStart.lat, mid.lat, t),
        degPerPx: DEG / logLerp(r0, r1, slide),
        offX: lerp(off0.x, 0, slide),
        offY: lerp(off0.y, 0, slide),
        curve: 1,
        eq: 0,
        africaOnly: 0,
        cellMix: 0,
        flatGrid: 0,
        zoom: 0,
        pan: 0,
        lit: 0,
      };
    }

    if (p < morphEnd) {
      const m = easeInOutCubic((p - rotateEnd) / (morphEnd - rotateEnd));
      return {
        lon: mid.lon,
        lat: mid.lat,
        // The scale at the center grows from the globe radius to the map scale
        // while the sphere loses its curvature, so Africa unfolds in place.
        degPerPx: DEG / logLerp(r1, DEG / flat0.degPerPx, m),
        offX: 0,
        offY: 0,
        curve: 1 - easeInOutCubic(clamp01(m / 0.85)),
        eq: smooth(0.5, 1, m),
        africaOnly: smooth(0.15, 0.75, m),
        cellMix: smooth(0.25, 0.85, m),
        flatGrid: smooth(0.3, 0.9, m),
        zoom: 0,
        pan: 0,
        lit: 0,
      };
    }

    const flat = { offX: 0, offY: 0, curve: 0, eq: 1, africaOnly: 1, cellMix: 1, flatGrid: 1 };
    if (p < zoomEnd) {
      const zoom = easeInOutCubic(clamp01((p - morphEnd) / (zoomEnd - morphEnd)));
      return { ...this.flatCamera(zoom), ...flat, zoom, pan: 0, lit: 0 };
    }

    // Pan south at full zoom, pulling back slightly mid-way so the move reads
    // as a glide over the continent rather than a slide.
    const pan = easeInOutCubic(clamp01((p - panStart) / (panEnd - panStart)));
    const end = this.flatCamera(1);
    const south = mapConfig.southTarget;
    return {
      lon: lerp(end.lon, south.lon, pan),
      lat: lerp(end.lat, south.lat, pan),
      degPerPx: end.degPerPx * (1 + mapConfig.panDip * Math.sin(Math.PI * pan)),
      ...flat,
      zoom: 1,
      pan,
      lit: 0,
    };
  }

  /**
   * Closing: the opening in reverse. Pull back from Southern Africa to the whole
   * continent, fold the map back into the globe, then slide it to the right
   * where it started. Every marker stays lit the whole way.
   */
  private returnView(
    r: number,
    time: number,
    o: {
      mid: { lon: number; lat: number };
      flat0: { degPerPx: number };
      r0: number;
      r1: number;
      off0: { x: number; y: number };
    },
  ): View {
    r = clamp01(r);
    const flat = {
      offX: 0,
      offY: 0,
      curve: 0,
      eq: 1,
      africaOnly: 1,
      cellMix: 1,
      flatGrid: 1,
      pan: 1,
      lit: 1,
    };

    if (r < 0.4) {
      // Pull back: the south view widens to the whole-continent framing.
      const z = easeInOutCubic(r / 0.4);
      const d1 = this.flatCamera(1).degPerPx;
      const d0 = o.flat0.degPerPx;
      const degPerPx = logLerp(d1, d0, z);
      const w = (degPerPx - d1) / (d0 - d1);
      const south = mapConfig.southTarget;
      return {
        ...flat,
        lon: lerp(south.lon, o.mid.lon, w),
        lat: lerp(south.lat, o.mid.lat, w),
        degPerPx,
        zoom: 1 - z,
      };
    }

    const keep = 1 - mapConfig.closingWorld;
    if (r < 0.75) {
      // Fold back into the globe (the flattening, played backwards).
      const m = 1 - easeInOutCubic((r - 0.4) / 0.35);
      return {
        lon: o.mid.lon,
        lat: o.mid.lat,
        degPerPx: DEG / logLerp(o.r1, DEG / o.flat0.degPerPx, m),
        offX: 0,
        offY: 0,
        curve: 1 - easeInOutCubic(clamp01(m / 0.85)),
        eq: smooth(0.5, 1, m),
        africaOnly: Math.max(keep, smooth(0.15, 0.75, m)),
        cellMix: smooth(0.25, 0.85, m),
        flatGrid: smooth(0.3, 0.9, m),
        zoom: 0,
        pan: 1,
        lit: 1,
      };
    }

    // Slide to the right, beside the closing text, with a slow idle sway.
    const sl = easeInOutCubic((r - 0.75) / 0.25);
    const idle = this.opts.reducedMotion ? 0 : 6 * Math.sin(time * 0.12) * sl;
    return {
      lon: o.mid.lon + idle,
      lat: o.mid.lat,
      degPerPx: DEG / logLerp(o.r1, o.r0, sl),
      offX: lerp(0, o.off0.x, sl),
      offY: lerp(0, o.off0.y, sl),
      curve: 1,
      eq: 0,
      africaOnly: keep,
      cellMix: 0,
      flatGrid: 0,
      zoom: 0,
      pan: 1,
      lit: 1,
    };
  }

  /**
   * Flat map camera. zoom 0 frames the whole continent, zoom 1 is centered on
   * the target. The center moves in proportion to the scale change, so the
   * target point glides on screen instead of swinging.
   */
  private flatCamera(zoom: number) {
    const W = this.width;
    const H = this.height;
    const c = mapConfig.continent;
    const rw = 0.9 * W;
    const rh = 0.88 * H;
    const d0 = Math.max((c.maxLon - c.minLon) / rw, (c.maxLat - c.minLat) / rh);
    const lon0 = (c.minLon + c.maxLon) / 2;
    const lat0 = (c.minLat + c.maxLat) / 2;

    const d1 = mapConfig.endSpan / Math.max(W, H * 0.95);
    const { lon: lon1, lat: lat1 } = mapConfig.target;

    const degPerPx = logLerp(d0, d1, zoom);
    const w = (d0 - degPerPx) / (d0 - d1);
    return { lon: lerp(lon0, lon1, w), lat: lerp(lat0, lat1, w), degPerPx };
  }

  // ---------------------------------------------------------------- markers

  /** Random African land cells, snapped to dot centers, kept a few cells apart. */
  private pickMarkers(): Marker[] {
    const cell = mapConfig.cell;
    const picked: Marker[] = [];
    const minGap = cell * 3.2;
    type Box = { minLon: number; maxLon: number; minLat: number; maxLat: number };

    const inBox = (b: Box, lon: number, lat: number) =>
      lon > b.minLon && lon < b.maxLon && lat > b.minLat && lat < b.maxLat;
    const regionOf = (lon: number, lat: number): Marker["region"] =>
      inBox(mapConfig.westRegion, lon, lat)
        ? "west"
        : inBox(mapConfig.southRegion, lon, lat)
          ? "south"
          : null;

    const drop = (
      box: Box,
      count: number,
      phase: Marker["phase"],
      atMin: number,
      atMax: number,
      exclude: Box[] = [],
    ) => {
      let tries = 0;
      let added = 0;
      while (added < count && tries < 4000 && picked.length < MAX_MARKERS) {
        tries++;
        const lon =
          (Math.floor((box.minLon + Math.random() * (box.maxLon - box.minLon)) / cell) + 0.5) *
          cell;
        const lat =
          (Math.floor((box.minLat + Math.random() * (box.maxLat - box.minLat)) / cell) + 0.5) *
          cell;
        if (!this.mask.isAfrica(lon, lat)) continue;
        if (exclude.some((b) => inBox(b, lon, lat))) continue;
        if (picked.some((m) => Math.hypot(m.lon - lon, m.lat - lat) < minGap)) continue;
        picked.push({
          lon,
          lat,
          offline: Math.random() > mapConfig.onlineRatio,
          phase,
          at: atMin + Math.random() * (atMax - atMin),
          region: regionOf(lon, lat),
        });
        added++;
      }
    };

    const { westRegion, centralRegion, southRegion } = mapConfig;
    // Early in the zoom, a few markers across the continent (not where later ones go).
    drop(mapConfig.continent, mapConfig.markersElsewhere, "zoom", 0.12, 0.4, [
      westRegion,
      centralRegion,
      southRegion,
    ]);
    // Around the West Africa target, until the zoom settles.
    drop(westRegion, mapConfig.markersWest, "zoom", 0.3, 0.9);
    // During the pan: Central Africa as it passes, then Southern Africa as it arrives.
    drop(centralRegion, mapConfig.markersCentral, "pan", 0.1, 0.5);
    drop(southRegion, mapConfig.markersSouth, "pan", 0.45, 0.98);
    return picked;
  }

  // ---------------------------------------------------------------- GL setup

  private createProgram() {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p) ?? "link error");
    gl.useProgram(p);

    const names = [
      "uRes",
      "uOffset",
      "uCenter",
      "uDegPerPx",
      "uCurve",
      "uEq",
      "uAfricaOnly",
      "uCellMix",
      "uFlatGrid",
      "uCell",
      "uMask",
      "uFocus",
      "uTime",
      "uMotion",
      "uZoom",
      "uPxScale",
      "uMarkers",
      "uMarkerCount",
    ];
    for (const name of names) this.uniforms[name] = gl.getUniformLocation(p, name);
    return p;
  }

  private setupGeometry() {
    const gl = this.gl;
    const buf = gl.createBuffer();
    this.buffer = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // One oversized triangle covering the screen.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = this.uniforms;
    gl.uniform1f(u.uCell, mapConfig.cell);
    gl.uniform2f(u.uFocus, mapConfig.focus.lon, mapConfig.focus.lat);
    gl.uniform1f(u.uMotion, this.opts.reducedMotion ? 0 : 1);
    gl.uniform1i(u.uMarkerCount, this.markers.length);
  }

  private setupMaskTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    this.texture = tex;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.mask.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Longitude wraps around the globe; latitude does not.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.uniforms.uMask, 0);
  }
}
