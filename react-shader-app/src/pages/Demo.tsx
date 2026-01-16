import AnimatedShaderBackground from "../components/AnimatedShaderBackground";

const Demo = () => {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <AnimatedShaderBackground intensity={0.85} quality="high" />
      <header className="relative z-10 px-6 py-4">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-lg font-semibold">Aurora Forge</div>
          <div className="flex gap-6 text-sm text-slate-300">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#docs">Docs</a>
          </div>
          <button className="rounded-full border border-slate-600 px-4 py-2 text-sm">Sign In</button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Live Shader Engine</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Premium animated shader backgrounds for modern UIs.
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Powered by Three.js and GLSL, tuned for smooth performance on desktop and mobile. Swap shaders without touching
              layout code.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button className="rounded-full bg-neon px-6 py-3 font-semibold text-ink">Start Demo</button>
              <button className="rounded-full border border-slate-600 px-6 py-3">View Docs</button>
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-2xl border border-slate-700 bg-panel/70 p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Control Every Uniform</h3>
              <p className="mt-2 text-slate-300">
                Intensity, colors, speed, mouse interaction, and quality settings are exposed as props.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-panel/70 p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Production Ready</h3>
              <p className="mt-2 text-slate-300">
                Handles resize, DPR caps, tab visibility pause, and graceful fallback when WebGL is unavailable.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-6 md:grid-cols-3">
          {["Shader presets", "Low GPU mode", "Drop-in component"].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-700 bg-panel/70 p-6">
              <h4 className="text-base font-semibold">{item}</h4>
              <p className="mt-2 text-sm text-slate-300">Ship animated backgrounds without custom render loops.</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Demo;
