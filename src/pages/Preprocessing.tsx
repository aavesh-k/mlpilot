export default function Preprocessing() {
  const steps = [
    { name: "Missing Value Imputation", status: "Complete", color: "bg-tertiary" },
    { name: "One-Hot Encoding", status: "Complete", color: "bg-tertiary" },
    { name: "Standard Scaling", status: "In Progress", color: "bg-primary-container" },
    { name: "PCA Dimensionality Reduction", status: "Pending", color: "bg-surface-variant" },
    { name: "Train-Test Split", status: "Pending", color: "bg-surface-variant" },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Preprocessing <span className="text-secondary">Pipeline</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Deterministic transformations applied in sequence.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border-2 border-primary p-8 neo-shadow">
          <h3 className="font-headline font-black text-xl uppercase mb-6">Pipeline Steps</h3>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={step.name} className="flex items-center gap-4 p-4 border-2 border-primary">
                <span className="text-2xl font-black font-display text-on-surface-variant">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <p className="font-headline font-bold">{step.name}</p>
                </div>
                <span className={`${step.color} text-primary text-xs font-headline font-bold uppercase px-3 py-1 border-2 border-primary`}>
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-primary p-8 neo-shadow">
          <h3 className="font-headline font-black text-xl uppercase mb-6">Column Mapping</h3>
          <div className="space-y-3">
            {[
              { col: "feature_a", type: "Numerical", action: "Scale" },
              { col: "feature_b", type: "Categorical", action: "One-Hot" },
              { col: "target", type: "Numerical", action: "Passthrough" },
            ].map((m) => (
              <div key={m.col} className="flex items-center justify-between p-3 border-b border-primary last:border-b-0">
                <span className="font-headline font-bold text-sm">{m.col}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-on-surface-variant">{m.type}</span>
                  <span className="bg-primary-container text-primary px-2 py-0.5 border border-primary font-bold">{m.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
