# Animated Shader Background (React + Vite)

Production-ready React app with a reusable `AnimatedShaderBackground` component powered by Three.js + GLSL.

## Getting Started
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
The production output is in `/dist`.

## Deploy to Apache2
- Upload the contents of `/dist` to your Apache `DocumentRoot`.
- If you are not using React Router, no `.htaccess` rewrite rules are needed.

## Component Location
`src/components/AnimatedShaderBackground/AnimatedShaderBackground.tsx`

Shader files:
- `src/components/AnimatedShaderBackground/shaders/vertex.glsl`
- `src/components/AnimatedShaderBackground/shaders/fragment.glsl`
