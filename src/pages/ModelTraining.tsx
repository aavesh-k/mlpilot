export default function ModelTraining() {
  return (
    <div className="p-8 lg:p-12">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Model <span className="text-secondary">Training</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Configure and dispatch training jobs.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {[
          { name: "Random Forest", status: "Running", accuracy: "96.2%", eta: "4m 12s", color: "bg-tertiary" },
          { name: "XGBoost", status: "Running", accuracy: "94.7%", eta: "8m 30s", color: "bg-tertiary" },
          { name: "Logistic Regression", status: "Queued", accuracy: "—", eta: "—", color: "bg-surface-variant" },
        ].map((m) => (
          <div key={m.name} className="bg-white border-2 border-primary p-6 neo-shadow group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-headline text-2xl font-bold group-hover:text-tertiary transition-colors">{m.name}</h3>
              <span className={`${m.color} text-primary text-[10px] font-headline font-bold uppercase px-2 py-1 border-2 border-primary`}>
                {m.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">Accuracy</span>
                <span className="text-2xl font-headline font-black">{m.accuracy}</span>
              </div>
              <div>
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">ETA</span>
                <span className="text-2xl font-headline font-black">{m.eta}</span>
              </div>
            </div>
            <div className="h-2 bg-surface-variant border border-primary overflow-hidden">
              <div className="h-full bg-tertiary w-[60%]"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-primary p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-6">Training Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Algorithm", value: "Random Forest (ensemble)" },
            { label: "Max Depth", value: "12" },
            { label: "Estimators", value: "100" },
            { label: "Validation Split", value: "80/20" },
            { label: "Metric", value: "F1-Score" },
            { label: "Cross-Validation", value: "5-Fold" },
          ].map((c) => (
            <div key={c.label} className="flex justify-between items-center p-3 border-b border-primary">
              <span className="font-headline font-bold text-xs uppercase text-on-surface-variant">{c.label}</span>
              <span className="font-headline font-black">{c.value}</span>
            </div>
          ))}
        </div>
        <button className="mt-8 bg-primary text-white neo-border-sm px-8 py-4 font-headline font-black uppercase text-lg neo-shadow hover:neo-shadow-active transition-all w-full cursor-pointer">
          Dispatch Training
        </button>
      </div>
    </div>
  )
}
