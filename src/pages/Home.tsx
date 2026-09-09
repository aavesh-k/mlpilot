import { useState } from "react"
import { NavLink } from "react-router-dom"

const primaryCta =
  "bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm px-8 py-4 shadow-[4px_4px_0_0_#000] hover:bg-black/90 btn-press transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 inline-block"

const secondaryCta =
  "bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-sm px-8 py-4 shadow-[4px_4px_0_0_#000] hover:bg-[#ffd400] btn-press transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 inline-block"

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
      <div className="font-mono text-[10px] font-black uppercase tracking-widest text-black/60 mb-0.5">
        Feature Importance
      </div>
      {edaFeatures.map((f, i) => (
        <div
          key={f.name}
          className="flex items-center gap-2 cursor-default"
          onMouseEnter={() => setActive(i)}
        >
          <span className="w-16 font-mono text-[10px] font-black uppercase truncate text-black/60">
            {f.name}
          </span>
          <div className="flex-1 h-2.5 bg-white border-2 border-black overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${active === i ? "bg-[#ffd400]" : "bg-black"}`}
              style={{ width: `${Math.round(f.value * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[10px] font-black text-black/60">
            {active === i ? `${Math.round(f.value * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-brutal-grid flex flex-col">
      {/* Header — brutal acid */}
      <header className="border-b-[3px] border-black bg-[#c8ff00] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black shadow-[3px_3px_0_0_#fff] border-2 border-black flex items-center justify-center">
              <span className="text-[#ffd400] font-black text-xl leading-none">M</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-headline font-black text-xl uppercase tracking-tight text-black">MLPilot</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/70 font-bold">DATA → MODEL</span>
            </div>
          </NavLink>
          <div className="flex items-center gap-3">
            <NavLink to="/dashboard" className="hidden sm:inline-flex bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest px-4 py-2 shadow-[3px_3px_0_0_#000] hover:bg-[#ffd400] btn-press">
              Dashboard
            </NavLink>
            <NavLink to="/datasets" className="bg-black text-white border-2 border-black font-mono text-xs font-black uppercase tracking-widest px-6 py-2 shadow-[3px_3px_0_0_#000] hover:bg-black/90 btn-press">
              New run →
            </NavLink>
          </div>
        </div>
      </header>

      <div className="font-body px-4 max-w-7xl mx-auto w-full pb-0 flex-1">
        <section className="py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex bg-white border-2 border-black brutal-shadow px-4 py-1 font-mono text-xs uppercase tracking-widest font-black -rotate-1 mb-6">
              // local-first ml pipeline
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tight mb-6">
              <span className="inline-block bg-white border-2 border-black brutal-shadow px-2 -rotate-1">MLPilot</span>
              <br />
              From Dataset to
              <br />
              <span className="inline-block bg-[#ffd400] border-2 border-black brutal-shadow px-3 -rotate-2 mx-1">Shipped</span>
              <span className="text-[#ff0000]"> Model.</span>
            </h1>
            <p className="font-mono text-xs md:text-sm uppercase tracking-widest text-black/70 leading-relaxed max-w-xl mb-10 border-l-[3px] border-black pl-4 text-left">
              Upload your dataset and let MLPilot handle the heavy lifting: cleaning, preprocessing, and training multiple models with clear, side-by-side results. Spend your time on the decisions that matter, not the boilerplate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <NavLink to="/dashboard" className={primaryCta}>
                Get Started →
              </NavLink>
              <a href="#docs" className={secondaryCta}>
                How It Works
              </a>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="w-full aspect-square border-2 border-black bg-white brutal-shadow relative overflow-hidden -rotate-1 hover:rotate-0 transition-transform">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
                style={{ color: "#000" }}
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

                  <rect x="76" y="32" width="260" height="56" fill="currentColor" />
                  <rect x="70" y="26" width="260" height="56" fill="#fff" stroke="currentColor" strokeWidth="3" />
                  <rect x="80" y="36" width="36" height="36" fill="#0055ff" stroke="currentColor" strokeWidth="3" />
                  <g stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="88" y1="46" x2="108" y2="46" />
                    <line x1="88" y1="54" x2="108" y2="54" />
                    <line x1="88" y1="62" x2="108" y2="62" />
                    <line x1="98" y1="44" x2="98" y2="64" />
                  </g>
                  <text x="126" y="60" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">DATASET</text>

                  <rect x="76" y="118" width="260" height="56" fill="currentColor" />
                  <rect x="70" y="112" width="260" height="56" fill="#fff" stroke="currentColor" strokeWidth="3" />
                  <rect x="80" y="122" width="36" height="36" fill="#e63b2e" stroke="currentColor" strokeWidth="3" />
                  <path d="M88 140 L96 148 L110 130" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="square" />
                  <text x="126" y="146" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">CLEAN &amp; ENCODE</text>

                  <rect x="76" y="204" width="260" height="56" fill="currentColor" />
                  <rect x="70" y="198" width="260" height="56" fill="#fff" stroke="currentColor" strokeWidth="3" />
                  <rect x="80" y="208" width="36" height="36" fill="#ffd400" stroke="currentColor" strokeWidth="3" />
                  <g stroke="currentColor" strokeWidth="2">
                    <line x1="88" y1="217" x2="108" y2="217" />
                    <line x1="88" y1="226" x2="108" y2="226" />
                    <line x1="88" y1="235" x2="108" y2="235" />
                    <circle cx="96" cy="217" r="3" fill="currentColor" />
                    <circle cx="104" cy="226" r="3" fill="currentColor" />
                    <circle cx="94" cy="235" r="3" fill="currentColor" />
                  </g>
                  <text x="126" y="232" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="currentColor">TRAIN &amp; TUNE</text>

                  <rect x="76" y="290" width="260" height="56" fill="currentColor" />
                  <rect x="70" y="284" width="260" height="56" fill="#ffd400" stroke="currentColor" strokeWidth="3" />
                  <rect x="80" y="294" width="36" height="36" fill="#ffffff" stroke="currentColor" strokeWidth="3" />
                  <g fill="#000">
                    <rect x="87" y="314" width="6" height="10" />
                    <rect x="96" y="306" width="6" height="18" />
                    <rect x="105" y="300" width="6" height="24" />
                  </g>
                  <text x="126" y="318" className="font-headline" fontSize="17" fontWeight="700" letterSpacing="1" fill="#000">BENCHMARKED MODEL</text>
                </g>
              </svg>
              <div className="absolute bottom-3 right-3 bg-black text-white px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border-2 border-black">4-Stage Flow</div>
              <div className="absolute top-3 left-3 bg-[#ffd400] border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase">mlpilot.run</div>
            </div>
          </div>
        </section>

        {/* Multiplayer-style banner repurposed as MLPilot banner */}
        <div className="w-full border-y-[3px] border-black bg-[#c8ff00] -rotate-1 my-8 py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-black text-[#c8ff00] font-mono text-[10px] font-black uppercase px-2 py-1 border-2 border-black">Highlight</span>
            <span className="font-mono text-xs uppercase font-black tracking-widest text-black">Automated EDA — correlations, missing values & distribution shifts in one click.</span>
          </div>
          <NavLink to="/datasets" className="bg-black text-white font-mono text-xs font-black uppercase px-5 py-2 border-2 border-black shadow-[3px_3px_0_0_#fff] btn-press shrink-0">
            Upload Now →
          </NavLink>
        </div>

        <section id="docs" className="py-12 scroll-mt-24">
          <div className="mb-8">
            <h2 className="font-headline text-4xl font-black uppercase tracking-tight text-black">
              Machine Learning <span className="bg-[#ffd400] border-2 border-black px-2 brutal-shadow inline-block -rotate-1">Pipeline</span>
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-2">// from raw csv to leaderboard — no boilerplate</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 md:row-span-2 bg-white border-2 border-black p-6 flex flex-col justify-between brutal-shadow group hover:-translate-y-1 transition-transform">
              <div>
                <div className="flex justify-between items-start mb-10">
                  <span className="material-symbols-outlined text-5xl text-black">analytics</span>
                  <span className="bg-black text-[#ffd400] font-mono text-[10px] font-black uppercase px-2 py-1 border-2 border-black">Section 01</span>
                </div>
                <h3 className="font-headline text-3xl font-black uppercase mb-3 text-black">Auto-EDA</h3>
                <p className="font-mono text-xs uppercase tracking-widest text-black/70 leading-relaxed">
                  Automated exploratory data analysis. Instantly discover correlations, missing values, and distribution shifts without writing a single line of Python.
                </p>
              </div>
              <div className="mt-8 border-t-2 border-black pt-6">
                <div className="w-full h-40 border-2 border-black bg-[#f5f5f0] p-3">
                  <EdaChart />
                </div>
              </div>
            </div>

            <div className="bg-[#ff0000] text-white border-2 border-black p-6 brutal-shadow flex flex-col gap-3 -rotate-1 hover:rotate-0 transition-transform">
              <span className="material-symbols-outlined text-4xl">rocket_launch</span>
              <h3 className="font-headline text-xl font-black uppercase">Rapid Prototyping</h3>
              <p className="font-mono text-xs uppercase tracking-widest leading-relaxed">Train 10 algorithms simultaneously. Scikit-Learn baked-in.</p>
            </div>

            <div className="bg-[#0055ff] text-white border-2 border-black p-6 brutal-shadow flex flex-col gap-3 rotate-1 hover:rotate-0 transition-transform">
              <span className="material-symbols-outlined text-4xl">leaderboard</span>
              <h3 className="font-headline text-xl font-black uppercase">Benchmarking</h3>
              <p className="font-mono text-xs uppercase tracking-widest leading-relaxed">Cross-validated scoring + automated leaderboard.</p>
            </div>

            <div className="md:col-span-2 bg-white border-2 border-black brutal-shadow relative h-64 overflow-hidden">
              <svg
                viewBox="0 0 400 200"
                className="absolute inset-0 w-full h-full p-4"
                style={{ color: "#000" }}
                role="img"
                aria-label="Real-time inference flow from input data through a model to predictions"
              >
                <rect x="24" y="64" width="84" height="104" fill="#fff" stroke="currentColor" strokeWidth="3" />
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="36" y1="88" x2="96" y2="88" />
                  <line x1="36" y1="112" x2="96" y2="112" />
                  <line x1="36" y1="136" x2="96" y2="136" />
                  <line x1="36" y1="160" x2="96" y2="160" />
                </g>
                <text x="66" y="186" className="font-headline" fontSize="12" fontWeight="700" letterSpacing="1" fill="currentColor" textAnchor="middle">INPUT</text>
                <line x1="108" y1="116" x2="146" y2="116" stroke="currentColor" strokeWidth="4" />
                <polygon points="146,116 136,109 136,123" fill="currentColor" />
                <rect x="146" y="58" width="100" height="114" fill="#ffd400" stroke="currentColor" strokeWidth="3" />
                <rect x="170" y="86" width="52" height="40" fill="#0055ff" stroke="currentColor" strokeWidth="2" />
                <g stroke="currentColor" strokeWidth="2">
                  <line x1="170" y1="96" x2="158" y2="96" />
                  <line x1="170" y1="106" x2="158" y2="106" />
                  <line x1="170" y1="116" x2="158" y2="116" />
                  <line x1="222" y1="96" x2="234" y2="96" />
                  <line x1="222" y1="106" x2="234" y2="106" />
                  <line x1="222" y1="116" x2="234" y2="116" />
                </g>
                <text x="196" y="162" className="font-headline" fontSize="14" fontWeight="700" letterSpacing="1" fill="#000" textAnchor="middle">MODEL</text>
                <line x1="246" y1="116" x2="296" y2="116" stroke="currentColor" strokeWidth="4" />
                <polygon points="296,116 286,109 286,123" fill="currentColor" />
                <rect x="300" y="100" width="16" height="60" fill="#0055ff" />
                <rect x="320" y="70" width="16" height="90" fill="#ff0000" />
                <rect x="340" y="114" width="16" height="46" fill="#ffd400" stroke="#000" strokeWidth="1" />
                <rect x="360" y="86" width="16" height="74" fill="#0055ff" />
                <text x="300" y="186" className="font-headline" fontSize="12" fontWeight="700" letterSpacing="1" fill="currentColor">OUTPUT</text>
              </svg>
              <div className="absolute top-3 left-3 bg-[#ffd400] border-2 border-black px-2 py-1 font-mono text-[10px] font-black uppercase">model.pkl</div>
              <div className="absolute top-3 right-3 bg-white border-2 border-black px-2 py-1 font-mono text-[10px] uppercase">v1.0 • local</div>
            </div>
          </div>
        </section>

        <section className="py-8 bg-black border-[3px] border-black p-8 md:p-12 relative overflow-hidden brutal-shadow-xl">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex bg-[#ffd400] border-2 border-black px-3 py-1 font-mono text-[10px] font-black uppercase -rotate-1 mb-4 text-black">deterministic engine</div>
              <h2 className="font-headline text-4xl md:text-5xl font-black uppercase leading-tight mb-6 text-white">
                Automated <br /><span className="bg-[#c8ff00] text-black px-2 border-2 border-black inline-block -rotate-1">Workflow</span> Logic
              </h2>
              <p className="font-mono text-xs uppercase tracking-widest text-white/70 mb-8 max-w-md leading-relaxed">
                Our deterministic engine handles cleaning, preprocessing, and encoding based on the semantic structure of your data. No magic, just math.
              </p>
              <div className="space-y-3">
                {workflowSteps.map((step, i) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 bg-white border-2 border-black p-3 brutal-shadow-sm"
                  >
                    <span className="w-9 h-9 bg-black text-[#ffd400] flex items-center justify-center font-mono font-black text-sm shrink-0">0{i + 1}</span>
                    <span className="font-mono font-black uppercase tracking-widest text-xs text-black">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-full max-w-sm bg-white border-[3px] border-black p-6 brutal-shadow rotate-1">
                <div className="bg-[#ffd400] border-b-2 border-black -mx-6 -mt-6 mb-6 px-4 py-2 flex justify-between">
                  <span className="font-mono text-[10px] font-black uppercase">leaderboard.data</span>
                  <span className="font-mono text-[10px]">✕</span>
                </div>
                <svg
                  viewBox="0 0 320 320"
                  className="w-full"
                  style={{ color: "#000" }}
                  role="img"
                  aria-label="Model leaderboard ranking the top trained algorithms by score"
                >
                  <text x="20" y="36" className="font-headline" fontSize="16" fontWeight="700" letterSpacing="2" fill="currentColor">LEADERBOARD</text>
                  <circle cx="40" cy="110" r="20" fill="#ffd400" stroke="#000" strokeWidth="2" />
                  <text x="40" y="116" className="font-headline" fontSize="16" fontWeight="700" fill="#000" textAnchor="middle">1</text>
                  <text x="72" y="104" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">XGBoost</text>
                  <rect x="72" y="116" width="210" height="14" fill="#fff" stroke="#000" strokeWidth="2" />
                  <rect x="72" y="116" width="197" height="14" fill="#ffd400" stroke="#000" strokeWidth="1" />
                  <circle cx="40" cy="190" r="20" fill="#c8ff00" stroke="#000" strokeWidth="2" />
                  <text x="40" y="196" className="font-headline" fontSize="16" fontWeight="700" fill="#000" textAnchor="middle">2</text>
                  <text x="72" y="184" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">Random Forest</text>
                  <rect x="72" y="196" width="210" height="14" fill="#fff" stroke="#000" strokeWidth="2" />
                  <rect x="72" y="196" width="185" height="14" fill="#c8ff00" stroke="#000" strokeWidth="1" />
                  <circle cx="40" cy="270" r="20" fill="#ff0000" stroke="#000" strokeWidth="2" />
                  <text x="40" y="276" className="font-headline" fontSize="16" fontWeight="700" fill="#fff" textAnchor="middle">3</text>
                  <text x="72" y="264" className="font-headline" fontSize="14" fontWeight="700" fill="currentColor">Logistic Reg</text>
                  <rect x="72" y="276" width="210" height="14" fill="#fff" stroke="#000" strokeWidth="2" />
                  <rect x="72" y="276" width="170" height="14" fill="#ff0000" stroke="#000" strokeWidth="1" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="font-headline text-3xl font-black uppercase mb-12 text-black tracking-tight">Core Technologies</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: "code", label: "Python 3.12" },
              { icon: "model_training", label: "Scikit-Learn" },
              { icon: "terminal", label: "CLI & SDK" },
              { icon: "api", label: "REST API" },
            ].map((tech) => (
              <div key={tech.label} className="flex flex-col items-center gap-3 group">
                <div className="w-24 h-24 border-2 border-black bg-white flex items-center justify-center brutal-shadow group-hover:bg-[#ffd400] transition-colors group-hover:-translate-y-1">
                  <span className="material-symbols-outlined text-4xl text-black">{tech.icon}</span>
                </div>
                <span className="font-mono font-black uppercase text-[10px] tracking-widest text-black">{tech.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 text-center bg-[#ffd400] border-2 border-black brutal-shadow -rotate-1 mx-2">
          <div className="rotate-1">
            <h2 className="font-headline text-4xl md:text-6xl font-black uppercase mb-4 text-black tracking-tight">Ready to Pilot?</h2>
            <p className="font-mono text-xs uppercase tracking-widest text-black/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Skip the boilerplate. Get to the insights. Deployment ready artifacts in minutes, not days.
            </p>
            <NavLink
              to="/dashboard"
              className="bg-black text-white border-2 border-black font-mono font-black text-lg uppercase tracking-widest px-12 py-5 shadow-[6px_6px_0_0_#000] hover:bg-black/90 btn-press inline-block"
            >
              Start Free Run →
            </NavLink>
          </div>
        </section>
      </div>

      <footer className="bg-black text-white border-t-[3px] border-black mt-12">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h4 className="font-headline font-black text-2xl uppercase mb-4">
              <span className="text-white">ML</span><span className="text-[#c8ff00]">Pilot</span>
            </h4>
            <p className="font-mono text-xs uppercase tracking-widest text-white/60 leading-relaxed">
              Built for engineers who value efficiency over hype. Brutalist automation for data science.
            </p>
          </div>
          <div>
            <h5 className="font-mono font-black uppercase text-[10px] tracking-widest mb-4 text-[#ffd400]">Platform</h5>
            <ul className="space-y-2 font-mono text-xs uppercase tracking-widest">
              {platformLinks.map((l) => (
                <li key={l.label}>
                  <NavLink to={l.to} className="hover:text-[#ffd400] hover:underline">
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-mono font-black uppercase text-[10px] tracking-widest mb-4 text-[#ffd400]">Connect</h5>
            <ul className="space-y-2 font-mono text-xs uppercase tracking-widest">
              {socialLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#ffd400] hover:underline">
                    {l.label === "GitHub" ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.62 8.21 11.18.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.21.96-.26 1.98-.39 3-.4 1.02 0 2.04.14 3 .4 2.29-1.53 3.3-1.21 3.3-1.21.66 1.65.25 2.87.12 3.17.77.83 1.23 1.88 1.23 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.08.81 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.83.56C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" /></svg>
                    )}
                    <span>{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-mono font-black uppercase text-[10px] tracking-widest mb-4 text-[#ffd400]">Status</h5>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 bg-[#c8ff00] animate-pulse border border-black"></div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest">All Systems Operational</span>
            </div>
            <div className="p-3 border-2 border-white/20 text-[10px] font-mono text-white/50 leading-relaxed">
              VERSION: 1.0.4-STABLE<br />Uptime: 99.998%<br />Last Deployment: 2026-08-16
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">© 2026 MLPILOT LABORATORY. ALL RIGHTS RESERVED.</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">DATA → MODEL • LOCAL-FIRST</span>
        </div>
      </footer>
    </div>
  )
}
