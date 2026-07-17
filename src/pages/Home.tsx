import { NavLink } from "react-router-dom"

export default function Home() {
  return (
    <div className="font-body pt-24 px-6 max-w-7xl mx-auto pb-20">
      <section className="py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7">
          <h1 className="font-display text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter mb-8">
            MLPilot: <br />
            <span className="text-secondary">The AI Engine</span> <br />
            for Engineers.
          </h1>
          <p className="text-xl md:text-2xl font-medium max-w-xl mb-10 leading-relaxed border-l-4 border-primary pl-6">
            Automate your ML workflow from dataset to deployment with neo-brutalist precision. FORM FOLLOWS FUNCTION.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <NavLink
              to="/dashboard"
              className="bg-primary-container text-on-primary-container neo-border font-headline font-black uppercase text-xl px-8 py-4 neo-shadow hover:neo-shadow-active transition-all text-center sm:text-left"
            >
              Launch Dashboard
            </NavLink>
            <a
              href="#docs"
              className="bg-white text-primary neo-border font-headline font-black uppercase text-xl px-8 py-4 neo-shadow hover:neo-shadow-active transition-all text-center sm:text-left"
            >
              Documentation
            </a>
          </div>
        </div>
        <div className="md:col-span-5 relative">
          <div className="w-full aspect-square neo-border bg-tertiary-container relative overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 neo-border bg-white rotate-45 flex items-center justify-center group-hover:rotate-90 transition-transform duration-700">
                <span className="material-symbols-outlined text-7xl -rotate-45 group-hover:-rotate-90 transition-transform duration-700">
                  automation
                </span>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 bg-primary text-white p-4 font-headline font-bold uppercase tracking-widest text-xs">
              Ref. 001-ALPHA
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mb-12">
          <h2 className="font-display text-4xl font-black uppercase tracking-tight">
            Machine Learning <span className="bg-primary text-white px-2">Pipeline</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 md:row-span-2 bg-white neo-border p-8 flex flex-col justify-between neo-shadow group hover:bg-primary-container transition-colors">
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
              <div className="w-full h-40 neo-border-sm bg-surface-variant flex items-center justify-center text-on-surface-variant font-headline font-bold uppercase text-sm">
                [EDA Visualization]
              </div>
            </div>
          </div>

          <div className="bg-secondary text-white neo-border p-8 neo-shadow flex flex-col gap-4">
            <span className="material-symbols-outlined text-4xl">rocket_launch</span>
            <h3 className="font-display text-2xl font-black uppercase">Rapid Prototyping</h3>
            <p className="text-sm font-medium">Train 9 models simultaneously. Scikit-Learn integration baked-in.</p>
          </div>

          <div className="bg-tertiary text-white neo-border p-8 neo-shadow flex flex-col gap-4">
            <span className="material-symbols-outlined text-4xl">leaderboard</span>
            <h3 className="font-display text-2xl font-black uppercase">Benchmarking</h3>
            <p className="text-sm font-medium">Cross-validated scoring and automated leaderboard generation.</p>
          </div>

          <div className="md:col-span-2 bg-white neo-border neo-shadow relative h-64 overflow-hidden">
            <div className="absolute inset-0 bg-surface-variant flex items-center justify-center text-on-surface-variant font-headline font-bold uppercase text-sm">
              [Real-time Inference Geometry]
            </div>
            <div className="absolute top-4 left-4 bg-primary text-white p-2 font-headline font-bold text-xs uppercase">
              Real-time Inference Geometry
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-white neo-border p-12 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-5xl font-black uppercase leading-tight mb-6">
              Automated <br /><span className="text-primary-container">Workflow</span> Logic
            </h2>
            <p className="text-lg opacity-80 mb-8 max-w-md">
              Our deterministic engine handles cleaning, preprocessing, and encoding based on the semantic structure of your data. No magic, just math.
            </p>
            <div className="space-y-4">
              {["Ingest & Profile", "Auto-Cleaning", "Hyperparameter Tuning"].map((step, i) => (
                <div key={step} className="flex items-center gap-4 bg-white/10 p-4 neo-border-sm border-white/20 hover:bg-white/20 cursor-pointer transition-all">
                  <span className="text-2xl font-black font-display">0{i + 1}</span>
                  <span className="font-headline font-bold uppercase">{step}</span>
                  <span className="material-symbols-outlined ml-auto">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 border-[40px] border-white/5 rounded-full pointer-events-none"></div>
      </section>

      <section className="py-20 text-center">
        <h2 className="font-display text-3xl font-black uppercase mb-16 underline decoration-4 decoration-secondary underline-offset-8">
          Core Technologies
        </h2>
        <div className="flex flex-wrap justify-center gap-12">
          {[
            { icon: "code", label: "Python 3.11" },
            { icon: "database", label: "Scikit-Learn" },
            { icon: "terminal", label: "CLI & SDK" },
            { icon: "api", label: "REST Interface" },
          ].map((tech) => (
            <div key={tech.label} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 neo-border bg-white flex items-center justify-center neo-shadow group-hover:bg-primary-container transition-all">
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
          className="bg-primary text-white neo-border font-display font-black text-2xl uppercase px-12 py-6 neo-shadow hover:neo-shadow-active transition-all active:scale-95 inline-block w-full sm:w-auto"
        >
          Start Free Run
        </NavLink>
      </section>

      <footer className="bg-primary text-white border-t-2 border-primary py-12 px-6 -mx-6 -mb-20 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <h4 className="font-display font-black text-2xl uppercase mb-6">MLPilot</h4>
            <p className="text-sm opacity-60 leading-relaxed font-medium">
              Built for engineers who value efficiency over hype. Neo-brutalist automation for the next generation of data science.
            </p>
          </div>
          <div>
            <h5 className="font-headline font-bold uppercase text-xs tracking-widest mb-6 text-primary-container">Platform</h5>
            <ul className="space-y-3 text-sm font-medium">
              {["Dashboard", "API Reference", "Model Hub", "Pricing"].map((l) => (
                <li key={l}><a className="hover:underline" href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-headline font-bold uppercase text-xs tracking-widest mb-6 text-primary-container">Company</h5>
            <ul className="space-y-3 text-sm font-medium">
              {["About", "Manifesto", "Open Source", "Contact"].map((l) => (
                <li key={l}><a className="hover:underline" href="#">{l}</a></li>
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
              Last Deployment: 2023-11-20
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-xs font-headline uppercase tracking-widest opacity-40">© 2023 MLPILOT LABORATORY. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6">
            <span className="material-symbols-outlined opacity-60 hover:opacity-100 transition-opacity cursor-pointer">terminal</span>
            <span className="material-symbols-outlined opacity-60 hover:opacity-100 transition-opacity cursor-pointer">public</span>
            <span className="material-symbols-outlined opacity-60 hover:opacity-100 transition-opacity cursor-pointer">data_object</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
