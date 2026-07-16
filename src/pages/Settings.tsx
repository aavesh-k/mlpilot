export default function Settings() {
  return (
    <div className="p-8 lg:p-12 max-w-4xl">
      <section className="mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none mb-4 tracking-tighter">
          Settings & <span className="text-secondary">Config</span>
        </h1>
        <p className="text-xl text-on-surface-variant font-medium">System configuration and preferences.</p>
      </section>

      <div className="space-y-8">
        {[
          {
            title: "API Configuration",
            fields: [
              { label: "API Endpoint", value: "https://api.mlpilot.io/v2" },
              { label: "Default Project", value: "Alpha-Neural-X" },
            ],
          },
          {
            title: "Resource Limits",
            fields: [
              { label: "Max Memory", value: "32 GB" },
              { label: "Max Runtime", value: "4 hours" },
              { label: "Parallel Jobs", value: "3" },
            ],
          },
          {
            title: "Notifications",
            fields: [
              { label: "Email Alerts", value: "Enabled" },
              { label: "Webhook URL", value: "https://hooks.mlpilot.io/events" },
            ],
          },
        ].map((section) => (
          <div key={section.title} className="bg-white border-2 border-primary p-8 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-6">{section.title}</h3>
            <div className="space-y-4">
              {section.fields.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3 border-b border-primary last:border-b-0">
                  <span className="font-headline font-bold text-xs uppercase text-on-surface-variant">{f.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm">{f.value}</span>
                    <button className="text-xs font-headline font-bold uppercase border-2 border-primary px-2 py-1 hover:bg-primary hover:text-white transition-colors cursor-pointer">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-4 pt-4">
          <button className="bg-primary text-white neo-border-sm px-8 py-4 font-headline font-black uppercase text-lg neo-shadow hover:neo-shadow-active transition-all flex-1 cursor-pointer">
            Save Configuration
          </button>
          <button className="bg-secondary text-white neo-border-sm px-8 py-4 font-headline font-black uppercase text-lg neo-shadow hover:neo-shadow-active transition-all cursor-pointer">
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
