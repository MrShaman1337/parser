precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform vec3 u_colorA;
uniform vec3 u_colorB;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  vec2 uv = (st - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

  float t = u_time * 0.05;
  float n = fbm(uv * 2.5 + t);
  float glow = smoothstep(0.2, 0.95, n) * 1.2;

  vec3 base = mix(u_colorA, u_colorB, st.y + n * 0.2);
  vec3 accent = vec3(0.6, 0.9, 1.2) * glow;

  float mouseInfluence = length(uv - (u_mouse / u_resolution - 0.5) * 2.0);
  float pulse = smoothstep(0.6, 0.0, mouseInfluence);

  vec3 color = base + accent * u_intensity + pulse * 0.15;
  color = pow(color, vec3(1.1));
  gl_FragColor = vec4(color, 1.0);
}
