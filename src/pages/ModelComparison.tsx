export default function ModelComparison() {
  const models = [
    { name: "Random Forest", f1: "0.962", precision: "0.958", recall: "0.967", accuracy: "96.2%" },
    { name: "XGBoost", f1: "0.947", precision: "0.941", recall: "0.953", accuracy: "94.7%" },
    { name: "Logistic Regression", f1: "0.884", precision: "0.879", recall: "0.889", accuracy: "88.4%" },
    { name: "SVM", f1: "0.912", precision: "0.908", recall: "0.916", accuracy: "91.2%" },
  ]

  return (
    <div className="p-8 lg:p-12">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Model <span className="text-tertiary">Comparison</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Cross-validated performance across all trained models.</p>
      </section>

      <div className="bg-white border-2 border-primary neo-shadow overflow-x-auto mb-10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-primary bg-surface-container-low">
              {["Model", "F1-Score", "Precision", "Recall", "Accuracy", ""].map((h) => (
                <th key={h} className="p-4 font-headline font-bold text-xs uppercase text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className="border-b border-primary last:border-b-0 hover:bg-primary-container/20 transition-colors">
                <td className="p-4 font-headline font-bold">{m.name}</td>
                <td className="p-4 font-headline font-black text-lg">{m.f1}</td>
                <td className="p-4 font-headline font-black text-lg">{m.precision}</td>
                <td className="p-4 font-headline font-black text-lg">{m.recall}</td>
                <td className="p-4 font-headline font-black text-lg">{m.accuracy}</td>
                <td className="p-4">
                  <button className="font-headline font-bold text-xs uppercase border-2 border-primary px-3 py-1 hover:bg-primary hover:text-white transition-colors cursor-pointer">
                    Deploy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border-2 border-primary p-8 neo-shadow">
        <h3 className="font-headline font-black text-xl uppercase mb-4">Best Model</h3>
        <div className="flex items-center gap-6 p-6 border-2 border-primary bg-primary-container/20">
          <div className="w-16 h-16 bg-tertiary border-2 border-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-white">emoji_events</span>
          </div>
          <div>
            <p className="font-headline text-3xl font-black">Random Forest</p>
            <p className="text-on-surface-variant font-medium">96.2% accuracy — Recommended for production deployment</p>
          </div>
          <button className="ml-auto bg-primary text-white neo-border-sm px-6 py-3 font-headline font-black uppercase text-sm neo-shadow hover:neo-shadow-active transition-all cursor-pointer">
            Deploy to Registry
          </button>
        </div>
      </div>
    </div>
  )
}
