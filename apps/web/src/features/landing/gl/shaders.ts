export const MAX_MARKERS = 48;

export const vertexShader = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Everything is drawn per pixel. Each pixel is turned into a (lon, lat) point
// through a projection that morphs from an orthographic globe (uCurve = 1)
// to a flat azimuthal map (uCurve = 0), then blends into the equirectangular
// map used by the zoom (uEq = 1). A dot is drawn in every grid cell whose
// center is on land, and the status markers are drawn on top.
export const fragmentShader = /* glsl */ `
precision highp float;
#define MAX_MARKERS ${MAX_MARKERS}

uniform vec2 uRes;          // canvas size, device px
uniform vec2 uOffset;       // projection center offset from screen center, px
uniform vec2 uCenter;       // projection center (lon, lat)
uniform float uDegPerPx;    // scale at the projection center
uniform float uCurve;       // 1 globe, 0 flat
uniform float uEq;          // 0 azimuthal, 1 equirectangular
uniform float uAfricaOnly;  // fades out land outside Africa
uniform float uCellMix;     // 0 coarse globe grid, 1 fine map grid
uniform float uFlatGrid;    // 0 grid follows the sphere, 1 square map grid
uniform float uCell;        // fine grid step, degrees
uniform sampler2D uMask;    // r: land, g: Africa (equirectangular, whole world)
uniform vec2 uFocus;        // continent center, for the soft light
uniform float uTime;
uniform float uMotion;      // 0 when prefers-reduced-motion
uniform float uZoom;        // eased zoom progress 0..1
uniform float uPxScale;     // device pixel ratio
uniform vec4 uMarkers[MAX_MARKERS]; // lon, lat, kind (0 online, 1 offline), reveal
uniform int uMarkerCount;

const float PI = 3.14159265;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 mask(vec2 ll) {
  if (ll.y < -90.0 || ll.y > 90.0) return vec2(0.0);
  vec2 uv = vec2((ll.x + 180.0) / 360.0, (90.0 - ll.y) / 180.0);
  vec4 m = texture2D(uMask, uv);
  return step(0.5, m.rg);
}

// One dot grid. Returns (alpha, random, africa).
vec3 dotGrid(vec2 ll, float cell, float offs, float aaDeg) {
  float rowf = (ll.y + offs) / cell;
  float row = floor(rowf);
  float rowLat = (row + 0.5) * cell - offs;
  // On the sphere, rows near the poles hold fewer dots so spacing stays even.
  float lonStep = cell * mix(1.0 / max(cos(radians(rowLat)), 0.2), 1.0, uFlatGrid);
  float colf = (ll.x + offs) / lonStep;
  float col = floor(colf);
  vec2 cc = vec2((col + 0.5) * lonStep - offs, rowLat);
  vec2 m = mask(cc);
  float landA = max(m.x, m.y) * mix(1.0, m.y, uAfricaOnly);
  if (landA < 0.01) return vec3(0.0);
  vec2 f = vec2(fract(colf) - 0.5, fract(rowf) - 0.5);
  float d = length(vec2(f.x * lonStep * mix(cos(radians(ll.y)), 1.0, uFlatGrid), f.y * cell));
  float r = mix(0.27, 0.32, uZoom) * cell;
  float a = 1.0 - smoothstep(r - aaDeg, r + aaDeg, d);
  return vec3(a * landA, hash(vec2(col, row) + cell), m.y);
}

vec3 dotColor(float h, vec2 ll, float limb) {
  float glow = exp(-pow(length(ll - uFocus) / 26.0, 2.0)) * (1.0 - 0.65 * uZoom);
  float twinkle = 1.0 + uMotion * 0.16 * sin(uTime * 0.9 + h * 6.2831);
  vec3 c = mix(vec3(0.29, 0.34, 0.44), vec3(0.62, 0.69, 0.80), glow);
  return c * mix(0.74 + 0.36 * h, 0.80 + 0.16 * h, uZoom) * mix(1.0, 0.72, uZoom) * twinkle * limb;
}

void main() {
  vec2 px = gl_FragCoord.xy - 0.5 * uRes - uOffset;
  vec2 suv = gl_FragCoord.xy / uRes;
  float globeAmt = smoothstep(0.0, 0.35, uCurve);

  // Background: midnight navy, lifted behind the subject, vignette.
  vec2 focusPx = mix(vec2(0.0), (uFocus - uCenter) / uDegPerPx, uEq);
  float fd = length(px - focusPx) / max(uRes.x, uRes.y);
  vec3 col = mix(vec3(0.050, 0.070, 0.125), vec3(0.030, 0.042, 0.078), smoothstep(0.0, 0.75, fd));
  vec2 v = suv - 0.5;
  col *= 1.0 - 0.55 * dot(v, v);

  // Projection: pixel -> angular distance c and bearing from the center.
  float radPerPx = radians(uDegPerPx);
  vec2 q = px * radPerPx;
  float r = length(q);
  float inside = 1.0;
  float c = r;
  if (uCurve > 0.001) {
    float s = r * uCurve;
    if (s >= 1.0) inside = 0.0;
    else c = asin(s) / uCurve;
  }

  vec2 llEq = uCenter + px * uDegPerPx;
  vec2 ll = llEq;
  if (uEq < 0.999 && inside > 0.5 && r > 1e-6) {
    float az = atan(q.x, q.y);
    float lat0 = radians(uCenter.y);
    float sl = clamp(sin(lat0) * cos(c) + cos(lat0) * sin(c) * cos(az), -1.0, 1.0);
    float lat = asin(sl);
    float lon = radians(uCenter.x) + atan(sin(az) * sin(c) * cos(lat0), cos(c) - sin(lat0) * sl);
    vec2 llAz = degrees(vec2(lon, lat));
    float dl = llAz.x - llEq.x;
    dl -= 360.0 * floor((dl + 180.0) / 360.0);
    ll = vec2(llEq.x + dl * (1.0 - uEq), mix(llAz.y, llEq.y, uEq));
  } else if (uEq < 0.999 && r <= 1e-6) {
    ll = uCenter;
  }
  ll.x -= 360.0 * floor((ll.x + 180.0) / 360.0);

  // Globe body and atmosphere rim.
  if (globeAmt > 0.0) {
    float rimR = 1.0 / (uCurve * radPerPx);
    float e = (length(px) - rimR) / rimR;
    float body = 1.0 - smoothstep(-1.5 * uPxScale / rimR, 1.5 * uPxScale / rimR, e);
    vec3 bodyCol = vec3(0.058, 0.080, 0.140) * (1.05 - 0.35 * length(px) / rimR);
    col = mix(col, bodyCol, body * 0.85 * globeAmt);
    float outer = exp(-max(e, 0.0) * 26.0) * step(0.0, e);
    float inner = smoothstep(-0.14, 0.0, e) * (1.0 - step(0.0, e));
    col += vec3(0.30, 0.46, 0.82) * (outer * 0.30 + inner * inner * 0.22) * globeAmt;
  }

  // Dots.
  if (inside > 0.5) {
    float z = cos(min(c * uCurve, 1.5707));       // facing ratio on the sphere
    float compress = mix(1.0 / max(z, 0.12), 1.0, uEq);
    float aaDeg = 0.75 * uPxScale * uDegPerPx * compress;
    float limb = mix(1.0, 0.30 + 0.70 * z, globeAmt);

    if (uCellMix < 0.999) {
      vec3 d = dotGrid(ll, uCell * 2.0, uCell * 0.5, aaDeg);
      col = mix(col, dotColor(d.y, ll, limb), d.x * 0.92 * (1.0 - uCellMix));
    }
    if (uCellMix > 0.001) {
      vec3 d = dotGrid(ll, uCell, 0.0, aaDeg);
      col = mix(col, dotColor(d.y, ll, limb), d.x * 0.92 * uCellMix);
    }
  }

  // Markers (only revealed once the map is flat): halo, pulse ring, core.
  float cellPx = uCell / uDegPerPx;
  float aa = 0.75 * uPxScale;
  for (int i = 0; i < MAX_MARKERS; i++) {
    if (i >= uMarkerCount) break;
    vec4 m = uMarkers[i];
    float rev = m.w;
    if (rev <= 0.001 || inside < 0.5) continue;  // never outside the globe
    vec3 mc = m.z > 0.5 ? vec3(0.95, 0.30, 0.31) : vec3(0.27, 0.88, 0.52);
    float d = length(ll - m.xy) / uDegPerPx;
    // Smaller markers on the globe, where many sit close together.
    float halo = max(cellPx * 0.95, mix(10.0, 6.0, globeAmt) * uPxScale);
    if (d > halo * 3.0) continue;

    float vis = clamp(rev, 0.0, 1.0);
    float unit = max(cellPx, mix(12.0, 7.0, globeAmt) * uPxScale) * rev;  // marker size follows the dot grid
    float core = unit * 0.27;
    float ringR = unit * 0.42;
    float ringW = max(unit * 0.07, 1.0 * uPxScale);

    // Soft glow in the marker color.
    float hg = exp(-pow(d / halo, 2.0) * 2.4) * vis;
    col = mix(col, mc * 0.30, hg * 0.50);
    col += mc * hg * 0.20;

    // Slow pulse ring.
    float t = fract(uTime * 0.42 + float(i) * 0.173);
    float rr = ringR + halo * 1.1 * t;
    float pulse = (1.0 - smoothstep(0.0, 1.3 * uPxScale, abs(d - rr))) * (1.0 - t) * 0.32 * uMotion * vis;
    col += mc * pulse;

    // Dark gap disc, then the thin outer ring, then the solid core with a light center.
    float disc = 1.0 - smoothstep(ringR + ringW * 0.5 - aa, ringR + ringW * 0.5 + aa, d);
    col = mix(col, vec3(0.035, 0.05, 0.09), disc * vis);
    float ring = 1.0 - smoothstep(ringW * 0.5 - aa, ringW * 0.5 + aa, abs(d - ringR));
    col = mix(col, mc * 1.05, ring * vis);
    float ca = 1.0 - smoothstep(core - aa, core + aa, d);
    vec3 coreCol = mix(mc, vec3(1.0), 0.25 * (1.0 - clamp(d / max(core, 1.0), 0.0, 1.0)));
    col = mix(col, coreCol, ca * vis);
  }

  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.01;
  gl_FragColor = vec4(col, 1.0);
}
`;
