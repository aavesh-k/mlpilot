import { useState } from "react"
import { NavLink } from "react-router-dom"

const primaryCta =
  "bg-primary text-on-primary neo-border font-headline font-black uppercase text-xl px-8 py-4 neo-shadow hover:neo-shadow-active transition-all text-center sm:text-left focus:outline-none focus-visible:neo-shadow-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

const secondaryCta =
  "bg-background text-primary neo-border font-headline font-black uppercase text-xl px-8 py-4 neo-shadow hover:neo-shadow-active transition-all text-center sm:text-left focus:outline-none focus-visible:neo-shadow-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

const workflowSteps = [
  "Upload & Profile",
  "Auto-Clean & Encode",
  "Train & Tune",
  "Benchmark & Compare",
]

const platformLinks = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Model Hub", to: "/compare" },
]

const socialLinks = [
  { label: "GitHub", href: "https://github.com/aavesh-k" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/mohammed-aavesh-karigar-921105353/",
  },
]

const edaFeatures = [
  { name: "Recency", value: 0.92 },
  { name: "Tenure", value: 0.77 },
  { name: "Income", value: 0.61 },
  { name: "Spend", value: 0.48 },
]

function EdaChart() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <div
      className="w-full h-full flex flex-col justify-center gap-1.5"
      onMouseLeave={() => setActive(null)}
    >
      <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">
        Feature Importance
      </div>
      {edaFeatures.map((f, i) => (
        <div
          key={f.name}
          className="flex items-center gap-2 cursor-default"
          onMouseEnter={() => setActive(i)}
        >
          <span className="w-16 text-[10px] font-headline font-bold uppercase truncate text-on-surface-variant">
            {f.name}
          </span>
          <div className="flex-1 h-2.5 bg-surface-container-lowest neo-border-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                active === i ? "bg-primary-container" : "bg-tertiary"
              }`}
              style={{ width: `${Math.round(f.value * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right text-[10px] font-headline font-bold text-on-surface-variant">
            {active === i ? `${Math.round(f.value * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="font-body pt-24 px-6 max-w-7xl mx-auto pb-20 scroll-smooth">
      <section className="py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7">
          <h1 className="font-display text-5xl md:text-7xl font-black uppercase leading-[0.95] tracking-tighter mb-8">
            <span className="text-primary">ML</span>
            <span className="text-secondary">Pilot</span>
            <br />
            From Dataset to
            <br />
            <span className="text-secondary">Shipped Model.</span>
          </h1>
          <p className="text-lg md:text-2xl font-medium max-w-xl mb-10 leading-relaxed border-l-4 border-primary pl-6">
            Upload your dataset and let MLPilot handle the heavy lifting: cleaning,
            preprocessing, and training multiple models with clear, side-by-side results.
            Spend your time on the decisions that matter, not the boilerplate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <NavLink to="/dashboard" className={primaryCta}>
              Get Started
            </NavLink>
            <a href="#docs" className={secondaryCta}>
              How It Works
            </a>
          </div>
        </div>
        <div className="md:col-span-5 relative">
          <div className="w-full aspect-square neo-border bg-tertiary-container relative overflow-hidden">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full"
              style={{ color: "rgb(var(--c-primary))" }}
              role="img"
              aria-label="MLPilot automated pipeline: from dataset through cleaning and training to a benchmarked model"
            >
              <g transform="translate(0,22)">
                <g stroke="currentColor" strokeWidth="4" fill="none">
                  <line x1="200" y1="84" x2="200" y2="100" />
                  <line x1="200" y1="170" x2="200" y2="186" />
                  <line x1="200" y1="256" x2="200" y2="272" />
                </g>
                <g fill="currentColor">
                  <polygon points="200,108 191,96 209,96" />
                  <polygon points="200,194 191,182 209,182" />
                  <polygon points="200,280 191,268 209,268" />
                </g>

                {/* Node 1: Dataset */}
                <rect x="76" y="32" width="260" height="56" fill="currentColor" />
                <rect x="70" y="26" width="260" height="56" fill="rgb(var(--c-surface-container-lowest))" stroke="currentColor" strokeWidth="3" />
                <rect x="80" y="36" width="36" height="36" fill="#0055ff" stroke="currentColor" strokeWidth="3" />
                <g stroke="currentColor" strokeWidth="2" fill="none">
                  <line x1="88" y1="46" x2="108" y2="46" />
                  <line x1="88" y1="54" x2="108" y2="54" />
                  <line x1="88" y1="62" x2="108" y2="62" />
                  <line x1="98" y1="44" x2="98" y2="64" />
                </g>
                <text x="126" y="60" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">DATASET</text>

                {/* Node 2: Clean & Encode */}
                <rect x="76" y="118" width="260" height="56" fill="currentColor" />
                <rect x="70" y="112" width="260" height="56" fill="rgb(var(--c-surface-container-lowest))" stroke="currentColor" strokeWidth="3" />
                <rect x="80" y="122" width="36" height="36" fill="#e63b2e" stroke="currentColor" strokeWidth="3" />
                <path d="M88 140 L96 148 L110 130" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="square" />
                <text x="126" y="146" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">CLEAN &amp; ENCODE</text>

                {/* Node 3: Train & Tune */}
                <rect x="76" y="204" width="260" height="56" fill="currentColor" />
                <rect x="70" y="198" width="260" height="56" fill="rgb(var(--c-surface-container-lowest))" stroke="currentColor" strokeWidth="3" />
                <rect x="80" y="208" width="36" height="36" fill="#ffcc00" stroke="currentColor" strokeWidth="3" />
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="88" y1="217" x2="108" y2="217" />
                  <line x1="88" y1="226" x2="108" y2="226" />
                  <line x1="88" y1="235" x2="108" y2="235" />
                  <circle cx="96" cy="217" r="3" fill="currentColor" />
                  <circle cx="104" cy="226" r="3" fill="currentColor" />
                  <circle cx="94" cy="235" r="3" fill="currentColor" />
                </g>
                <text x="126" y="232" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">TRAIN &amp; TUNE</text>

                {/* Node 4: Benchmarked Model */}
                <rect x="76" y="290" width="260" height="56" fill="currentColor" />
                <rect x="70" y="284" width="260" height="56" fill="rgb(var(--c-primary-container))" stroke="currentColor" strokeWidth="3" />
                <rect x="80" y="294" width="36" height="36" fill="#ffffff" stroke="currentColor" strokeWidth="3" />
                <g fill="rgb(var(--c-on-primary-container))">
                  <rect x="87" y="314" width="6" height="10" />
                  <rect x="96" y="306" width="6" height="18" />
                  <rect x="105" y="300" width="6" height="24" />
                </g>
                <text x="126" y="318" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="rgb(var(--c-on-primary-container))">BENCHMARKED MODEL</text>
              </g>
            </svg>
            <div className="absolute bottom-4 right-4 bg-primary text-on-primary p-3 font-headline font-bold uppercase tracking-widest text-xs">
              4-Stage Flow
            </div>
          </div>
        </div>
      </section>

      <section id="docs" className="py-20 scroll-mt-24">
        <div className="mb-12">
          <h2 className="font-display text-4xl font-black uppercase tracking-tight">
            Machine Learning <span className="bg-primary text-on-primary px-2">Pipeline</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 md:row-span-2 bg-surface neo-border p-8 flex flex-col justify-between neo-shadow group hover:bg-primary-container transition-colors">
            <div>
              <div className="flex justify-between items-start mb-12">
                <span className="material-symbols-outlined text-5xl">analytics</span>
                <span className="font-headline font-bold text-xs uppercase opacity-40">Section 01</span>
              </div>
              <h3 className="font-display text-4xl font-black uppercase mb-4">Auto-EDA</h3>
              <p className="text-lg opacity-80 leading-relaxed">
                Automated exploratory data analysis. Instantly discover correlations, missing values, and distribution shifts without writing a single line of Python.
              </p>
            </div>
            <div className="mt-8 border-t-2 border-primary pt-6">
              <div className="w-full h-40 neo-border-sm bg-surface-variant p-3">
                <EdaChart />
              </div>
            </div>
          </div>

          <div className="bg-secondary text-on-secondary neo-border p-8 neo-shadow flex flex-col gap-4">
            <span className="material-symbols-outlined text-4xl">rocket_launch</span>
            <h3 className="font-display text-2xl font-black uppercase">Rapid Prototyping</h3>
            <p className="text-sm font-medium">Train 10 algorithms simultaneously. Scikit-Learn integration baked-in.</p>
          </div>

          <div className="bg-tertiary text-on-tertiary neo-border p-8 neo-shadow flex flex-col gap-4">
            <span className="material-symbols-outlined text-4xl">leaderboard</span>
            <h3 className="font-display text-2xl font-black uppercase">Benchmarking</h3>
            <p className="text-sm font-medium">Cross-validated scoring and automated leaderboard generation.</p>
          </div>

          <div className="md:col-span-2 bg-surface neo-border neo-shadow relative h-64 overflow-hidden">
            <svg
              viewBox="0 0 400 200"
              className="absolute inset-0 w-full h-full p-4"
              style={{ color: "rgb(var(--c-on-surface))" }}
              role="img"
              aria-label="Real-time inference flow from input data through a model to predictions"
            >
              {/* Input */}
              <rect x="24" y="64" width="84" height="104" fill="rgb(var(--c-surface-container-lowest))" stroke="currentColor" strokeWidth="3" />
              <g stroke="currentColor" strokeWidth="2">
                <line x1="36" y1="88" x2="96" y2="88" />
                <line x1="36" y1="112" x2="96" y2="112" />
                <line x1="36" y1="136" x2="96" y2="136" />
                <line x1="36" y1="160" x2="96" y2="160" />
              </g>
              <text x="66" y="186" className="font-headline" fontSize="12" fontWeight="700" letterSpacing="1" fill="currentColor" textAnchor="middle">INPUT</text>

              {/* Arrow 1 */}
              <line x1="108" y1="116" x2="146" y2="116" stroke="currentColor" strokeWidth="4" />
              <polygon points="146,116 136,109 136,123" fill="currentColor" />

              {/* Model */}
              <rect x="146" y="58" width="100" height="114" fill="rgb(var(--c-primary-container))" stroke="currentColor" strokeWidth="3" />
              <rect x="170" y="86" width="52" height="40" fill="rgb(var(--c-tertiary))" stroke="currentColor" strokeWidth="2" />
              <g stroke="currentColor" strokeWidth="2">
                <line x1="170" y1="96" x2="158" y2="96" />
                <line x1="170" y1="106" x2="158" y2="106" />
                <line x1="170" y1="116" x2="158" y2="116" />
                <line x1="222" y1="96" x2="234" y2="96" />
                <line x1="222" y1="106" x2="234" y2="106" />
                <line x1="222" y1="116" x2="234" y2="116" />
              </g>
              <text x="196" y="162" className="font-headline" fontSize="14" fontWeight="700" letterSpacing="1" fill="rgb(var(--c-on-primary-container))" textAnchor="middle">MODEL</text>

              {/* Arrow 2 */}
              <line x1="246" y1="116" x2="296" y2="116" stroke="currentColor" strokeWidth="4" />
              <polygon points="296,116 286,109 286,123" fill="currentColor" />

              {/* Output */}
              <rect x="300" y="100" width="16" height="60" fill="rgb(var(--c-tertiary))" />
              <rect x="320" y="70" width="16" height="90" fill="rgb(var(--c-secondary))" />
              <rect x="340" y="114" width="16" height="46" fill="rgb(var(--c-primary-container))" />
              <rect x="360" y="86" width="16" height="74" fill="rgb(var(--c-tertiary))" />
              <text x="300" y="186" className="font-headline" fontSize="12" fontWeight="700" letterSpacing="1" fill="currentColor">OUTPUT</text>
            </svg>
            <div className="absolute top-4 left-4 bg-primary text-on-primary p-2 font-headline font-bold text-xs uppercase pointer-events-none">
              Real-time Inference Geometry
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface-strong text-on-surface-strong neo-border p-12 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-5xl font-black uppercase leading-tight mb-6">
              Automated <br /><span className="text-primary-container">Workflow</span> Logic
            </h2>
            <p className="text-lg opacity-80 mb-8 max-w-md">
              Our deterministic engine handles cleaning, preprocessing, and encoding based on the semantic structure of your data. No magic, just math.
            </p>
            <div className="space-y-4">
              {workflowSteps.map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-4 bg-white/10 p-4 neo-border-sm border-white/20"
                >
                  <span className="text-2xl font-black font-display">0{i + 1}</span>
                  <span className="font-headline font-bold uppercase">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-full max-w-sm bg-surface neo-border neo-shadow p-6">
              <svg
                viewBox="0 0 320 320"
                className="w-full"
                style={{ color: "rgb(var(--c-on-surface))" }}
                role="img"
                aria-label="Model leaderboard ranking the top trained algorithms by score"
              >
                <text x="20" y="36" className="font-headline" fontSize="16" fontWeight="700" letterSpacing="2" fill="currentColor">LEADERBOARD</text>
                {/* Rank 1 */}
                <circle cx="40" cy="110" r="20" fill="rgb(var(--c-primary-container))" />
                <text x="40" y="116" className="font-headline" fontSize="16" fontWeight="700" fill="rgb(var(--c-on-primary-container))" textAnchor="middle">1</text>
                <text x="72" y="104" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">XGBoost</text>
                <rect x="72" y="116" width="210" height="14" fill="rgb(var(--c-surface-variant))" />
                <rect x="72" y="116" width="197" height="14" fill="rgb(var(--c-primary-container))" />
                {/* Rank 2 */}
                <circle cx="40" cy="190" r="20" fill="rgb(var(--c-tertiary))" />
                <text x="40" y="196" className="font-headline" fontSize="16" fontWeight="700" fill="rgb(var(--c-on-tertiary))" textAnchor="middle">2</text>
                <text x="72" y="184" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">Random Forest</text>
                <rect x="72" y="196" width="210" height="14" fill="rgb(var(--c-surface-variant))" />
                <rect x="72" y="196" width="185" height="14" fill="rgb(var(--c-tertiary))" />
                {/* Rank 3 */}
                <circle cx="40" cy="270" r="20" fill="rgb(var(--c-secondary))" />
                <text x="40" y="276" className="font-headline" fontSize="16" fontWeight="700" fill="rgb(var(--c-on-secondary))" textAnchor="middle">3</text>
                <text x="72" y="264" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">Logistic Reg</text>
                <rect x="72" y="276" width="210" height="14" fill="rgb(var(--c-surface-variant))" />
                <rect x="72" y="276" width="170" height="14" fill="rgb(var(--c-secondary))" />
              </svg>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 border-[40px] border-white/5 rounded-full pointer-events-none"></div>
      </section>

      <section className="py-20 text-center">
        <h2 className="font-display text-3xl font-black uppercase mb-16">
          Core Technologies
        </h2>
        <div className="flex flex-wrap justify-center gap-12">
          {[
            { icon: "code", label: "Python 3.12" },
            { icon: "model_training", label: "Scikit-Learn" },
            { icon: "terminal", label: "CLI & SDK" },
            { icon: "api", label: "REST API" },
          ].map((tech) => (
            <div key={tech.label} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 neo-border bg-surface flex items-center justify-center neo-shadow group-hover:bg-primary-container transition-all">
                <span className="material-symbols-outlined text-4xl">{tech.icon}</span>
              </div>
              <span className="font-headline font-bold uppercase text-xs">{tech.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 text-center bg-primary-container neo-border neo-shadow">
        <h2 className="font-display text-5xl md:text-7xl font-black uppercase mb-8">Ready to Pilot?</h2>
        <p className="text-xl font-medium mb-12 max-w-2xl mx-auto">
          Skip the boilerplate. Get to the insights. Deployment ready artifacts in minutes, not days.
        </p>
        <NavLink
          to="/dashboard"
          className="bg-primary text-on-primary neo-border font-display font-black text-2xl uppercase px-12 py-6 neo-shadow hover:neo-shadow-active transition-all active:scale-95 inline-block w-full sm:w-auto focus:outline-none focus-visible:neo-shadow-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Start Free Run
        </NavLink>
      </section>

      <footer className="bg-surface-strong text-on-surface-strong border-t-2 border-primary py-12 px-6 -mx-6 -mb-20 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <h4 className="font-display font-black text-2xl uppercase mb-6">
              <span className="text-on-surface-strong">ML</span><span className="text-secondary">Pilot</span>
            </h4>
            <p className="text-sm opacity-60 leading-relaxed font-medium">
              Built for engineers who value efficiency over hype. Neo-brutalist automation for the next generation of data science.
            </p>
          </div>
          <div>
            <h5 className="font-headline font-bold uppercase text-xs tracking-widest mb-6 text-primary-container">Platform</h5>
            <ul className="space-y-3 text-sm font-medium">
              {platformLinks.map((l) => (
                <li key={l.label}>
                  <NavLink
                    to={l.to}
                    className="hover:underline focus:outline-none focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-sm"
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-headline font-bold uppercase text-xs tracking-widest mb-6 text-primary-container">Connect</h5>
            <ul className="space-y-3 text-sm font-medium">
              {socialLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:underline focus:outline-none focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-sm"
                  >
                    {l.label === "GitHub" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                        <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.62 8.21 11.18.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.21.96-.26 1.98-.39 3-.4 1.02 0 2.04.14 3 .4 2.29-1.53 3.3-1.21 3.3-1.21.66 1.65.25 2.87.12 3.17.77.83 1.23 1.88 1.23 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.08.81 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.83.56C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                      </svg>
                    )}
                    <span>{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-headline font-bold uppercase text-xs tracking-widest mb-6 text-primary-container">Status</h5>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-primary-container animate-pulse"></div>
              <span className="text-xs font-headline font-bold uppercase">All Systems Operational</span>
            </div>
            <div className="p-4 neo-border-sm border-white/20 text-[10px] font-mono opacity-50">
              VERSION: 1.0.4-STABLE<br />
              Uptime: 99.998%<br />
              Last Deployment: 2026-08-16
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-xs font-headline uppercase tracking-widest opacity-40">© 2026 MLPILOT LABORATORY. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>
    </div>
  )
}
