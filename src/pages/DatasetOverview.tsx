export default function DatasetOverview() {
  const columns = ["Name", "Type", "Missing %", "Unique", "Mean", "Std Dev"]
  const rows = [
    ["feature_a", "Numerical", "0.0%", "1,024", "0.452", "0.128"],
    ["feature_b", "Categorical", "2.3%", "12", "—", "—"],
    ["target", "Numerical", "0.0%", "512", "0.893", "0.042"],
    ["timestamp", "Datetime", "0.0%", "4,096", "—", "—"],
  ]

  return (
    <div className="p-8 lg:p-12">
      <section className="mb-10">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Dataset <span className="text-tertiary">Overview</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">training_data_v3.csv — 10,240 rows × 12 columns</p>
      </section>

      <div className="grid grid-cols-4 gap-6 mb-10">
        {[
          { label: "Rows", value: "10,240" },
          { label: "Columns", value: "12" },
          { label: "Size", value: "1.2 GB" },
          { label: "Missing", value: "0.8%" },
        ].map((s) => (
          <div key={s.label} className="bg-white border-2 border-primary p-4 neo-shadow-sm">
            <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">{s.label}</span>
            <span className="text-3xl font-headline font-black">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-primary neo-shadow overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-primary">
              {columns.map((c) => (
                <th key={c} className="p-4 font-headline font-bold text-xs uppercase text-on-surface-variant">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-primary last:border-b-0 hover:bg-surface-container-low transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="p-4 font-body text-sm font-medium">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
