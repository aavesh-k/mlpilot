export default function EDA() {
  return (
    <div className="p-8 lg:p-12">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Exploratory <span className="text-tertiary">Data Analysis</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Automated insights from your dataset.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border-2 border-primary p-8 neo-shadow">
          <h3 className="font-headline font-black text-xl uppercase mb-4">Correlation Matrix</h3>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }, (_, i) => (
              <div
                key={i}
                className="aspect-square border border-primary"
                style={{
                  backgroundColor: `rgba(0, 85, 255, ${Math.random() * 0.8 + 0.1})`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-headline font-bold text-on-surface-variant">
            <span>-1.0</span><span>0.0</span><span>+1.0</span>
          </div>
        </div>

        <div className="bg-white border-2 border-primary p-8 neo-shadow">
          <h3 className="font-headline font-black text-xl uppercase mb-4">Distribution Summary</h3>
          {[
            { name: "feature_a", skew: "0.32", range: "-2.1 — 3.4" },
            { name: "feature_b", skew: "1.87", range: "0 — 11" },
            { name: "target", skew: "-0.08", range: "0.0 — 1.0" },
          ].map((f) => (
            <div key={f.name} className="mb-6 last:mb-0">
              <div className="flex justify-between mb-1">
                <span className="font-headline font-bold text-sm">{f.name}</span>
                <span className="text-xs text-on-surface-variant">Skew: {f.skew}</span>
              </div>
              <div className="h-2 border border-primary bg-surface-variant relative overflow-hidden">
                <div className="h-full bg-tertiary/60" style={{ width: `${Math.random() * 80 + 10}%` }}></div>
              </div>
              <span className="text-[10px] text-on-surface-variant">{f.range}</span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border-2 border-primary p-8 neo-shadow">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline font-black text-xl uppercase">Key Findings</h3>
              <p className="text-on-surface-variant text-sm">Auto-generated insights</p>
            </div>
            <span className="bg-primary-container text-primary px-3 py-1 border-2 border-primary font-headline font-bold text-xs uppercase">Updated</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: "warning", title: "Missing Values", desc: "feature_b has 2.3% null ratio. Imputation recommended." },
              { icon: "insights", title: "High Correlation", desc: "feature_a and feature_c show 0.89 correlation. Consider dropping one." },
              { icon: "bar_chart", title: "Class Imbalance", desc: "Target distribution is skewed 68/32. Apply stratification." },
            ].map((f) => (
              <div key={f.title} className="border-2 border-primary p-4 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-3xl mb-2">{f.icon}</span>
                <h4 className="font-headline font-bold text-sm uppercase mb-1">{f.title}</h4>
                <p className="text-sm text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
