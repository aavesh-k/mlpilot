import { NavLink } from "react-router-dom"

const projects = [
  {
    name: "Alpha-Neural-X",
    time: "Created 2h ago",
    accuracy: "98.4%",
    dataset: "1.2GB",
    users: ["E", "B"],
    label: "Active Run",
    labelClass: "bg-primary-container text-primary",
  },
  {
    name: "Project: Gamma",
    time: "Created 1d ago",
    accuracy: "84.1%",
    dataset: "450MB",
    users: ["S"],
    label: null,
    labelClass: "",
  },
]

const logs = [
  { title: "Hyper-parameter Tuning Complete", time: "14:02 UTC", desc: "Found optimal learning rate at 0.0035 for Alpha-Neural-X.", color: "bg-tertiary" },
  { title: "Model Exported", time: "12:45 UTC", desc: "Project: Gamma successfully exported to production registry.", color: "bg-primary" },
  { title: "Convergence Alert", time: "10:11 UTC", desc: "Training delta exceeding threshold in Beta-Pipeline-7.", color: "bg-secondary" },
]

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <section className="mb-16">
        <h1 className="font-headline text-6xl md:text-8xl font-black uppercase leading-none mb-4 tracking-tighter">
          Welcome,<br /><span className="text-tertiary">Engineer</span>
        </h1>
        <p className="text-xl max-w-2xl text-on-surface-variant font-medium">
          Your latest models are converging. Review current trajectories or initiate a new heuristic sequence.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
        {projects.map((p) => (
          <div key={p.name} className="bg-surface-container-lowest border-2 border-primary p-6 neo-shadow relative group">
            {p.label && (
              <div className="absolute top-0 right-0 bg-primary-container text-primary font-headline text-[10px] font-black uppercase px-3 py-1 border-l-2 border-b-2 border-primary">
                {p.label}
              </div>
            )}
            <h3 className="font-headline text-3xl font-bold mb-1 group-hover:text-tertiary transition-colors">{p.name}</h3>
            <p className="text-on-surface-variant text-sm mb-6 font-medium">{p.time}</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border-2 border-primary p-3">
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">Accuracy</span>
                <span className="text-2xl font-headline font-black">{p.accuracy}</span>
              </div>
              <div className="border-2 border-primary p-3">
                <span className="block font-headline text-[10px] font-bold uppercase text-on-surface-variant">Dataset</span>
                <span className="text-2xl font-headline font-black">{p.dataset}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex -space-x-2">
                {p.users.map((u) => (
                  <div key={u} className="w-8 h-8 bg-tertiary border-2 border-primary flex items-center justify-center text-white font-bold text-xs uppercase">
                    {u}
                  </div>
                ))}
              </div>
              <button className="font-headline font-black uppercase text-sm border-b-2 border-primary flex items-center gap-1 hover:text-tertiary transition-colors cursor-pointer">
                Open Dashboard <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}

        <NavLink
          to="/datasets"
          className="bg-tertiary border-2 border-primary p-6 flex flex-col justify-center items-center group transition-all active:translate-x-1 active:translate-y-1 active:shadow-none neo-shadow"
        >
          <div className="w-16 h-16 bg-white border-2 border-primary mb-4 flex items-center justify-center transition-transform group-hover:rotate-90">
            <span className="material-symbols-outlined text-4xl font-bold">add</span>
          </div>
          <span className="font-headline text-2xl font-black uppercase text-white tracking-tighter">Initiate Sequence</span>
          <span className="font-headline text-xs font-bold text-white/70 uppercase mt-2">Create New Project</span>
        </NavLink>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border-2 border-primary p-8 neo-shadow">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-headline text-4xl font-black uppercase tracking-tight">Recent Activity</h2>
              <p className="text-on-surface-variant font-medium">Log for cluster node #402-B</p>
            </div>
            <button className="bg-primary text-white px-4 py-2 font-headline font-bold uppercase text-xs cursor-pointer">Full Log</button>
          </div>
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log.title} className="flex gap-4 items-start group">
                <div className="mt-1">
                  <div className={`w-4 h-4 ${log.color} border-2 border-primary rounded-full group-hover:scale-125 transition-transform`}></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <h4 className="font-headline font-black uppercase text-sm">{log.title}</h4>
                    <span className="text-xs font-bold text-on-surface-variant">{log.time}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant font-medium">{log.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary border-2 border-primary p-8 text-white neo-shadow flex flex-col relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary border-4 border-white opacity-20 rotate-12"></div>
          <h2 className="font-headline text-3xl font-black uppercase mb-6 relative z-10">Cluster Health</h2>
          <div className="space-y-8 relative z-10">
            <div>
              <div className="flex justify-between text-xs font-headline font-bold uppercase mb-2">
                <span>GPU Utilization</span><span>88%</span>
              </div>
              <div className="h-3 bg-white/20 border-2 border-white">
                <div className="h-full bg-primary-container w-[88%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-headline font-bold uppercase mb-2">
                <span>Storage Capacity</span><span>42%</span>
              </div>
              <div className="h-3 bg-white/20 border-2 border-white">
                <div className="h-full bg-tertiary w-[42%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-headline font-bold uppercase mb-2">
                <span>Throughput</span><span>Optimal</span>
              </div>
              <div className="flex gap-1 mt-1">
                {[true, true, true, false, false].map((on, i) => (
                  <div key={i} className={`h-6 w-2 ${on ? "bg-white" : "bg-white/30"}`}></div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-8">
            <div className="border-2 border-white p-4 text-center font-headline font-black uppercase text-xs hover:bg-white hover:text-primary transition-colors cursor-pointer">
              System Diagnostics
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
