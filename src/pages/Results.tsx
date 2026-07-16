export default function Results() {
  return (
    <div className="p-8 lg:p-12">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Results & <span className="text-secondary">Reports</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">Training outcomes and evaluation metrics.</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {[
          { icon: "check_circle", label: "Completed Runs", value: "12", color: "text-tertiary" },
          { icon: "pending", label: "In Progress", value: "3", color: "text-primary-container" },
          { icon: "error", label: "Failed", value: "1", color: "text-secondary" },
        ].map((s) => (
          <div key={s.label} className="bg-white border-2 border-primary p-6 neo-shadow flex items-center gap-4">
            <span className={`material-symbols-outlined text-5xl ${s.color}`}>{s.icon}</span>
            <div>
              <span className="block text-4xl font-headline font-black">{s.value}</span>
              <span className="text-on-surface-variant font-headline font-bold text-xs uppercase">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-primary neo-shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-primary bg-surface-container-low">
              {["Run ID", "Model", "Dataset", "Accuracy", "Status", "Date"].map((h) => (
                <th key={h} className="p-4 font-headline font-bold text-xs uppercase text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { id: "#042", model: "Random Forest", ds: "training_v3", acc: "96.2%", status: "Completed", color: "bg-tertiary" },
              { id: "#041", model: "XGBoost", ds: "training_v3", acc: "94.7%", status: "Completed", color: "bg-tertiary" },
              { id: "#040", model: "SVM", ds: "training_v3", acc: "91.2%", status: "Completed", color: "bg-tertiary" },
              { id: "#039", model: "Logistic Regression", ds: "training_v2", acc: "88.4%", status: "Completed", color: "bg-tertiary" },
            ].map((r) => (
              <tr key={r.id} className="border-b border-primary last:border-b-0 hover:bg-surface-container-low transition-colors">
                <td className="p-4 font-mono font-bold text-sm">{r.id}</td>
                <td className="p-4 font-headline font-bold">{r.model}</td>
                <td className="p-4 text-sm">{r.ds}</td>
                <td className="p-4 font-headline font-black">{r.acc}</td>
                <td className="p-4">
                  <span className={`${r.color} text-primary text-[10px] font-headline font-bold uppercase px-2 py-1 border-2 border-primary`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-on-surface-variant">2026-07-15</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
