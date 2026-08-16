import { NavLink } from 'react-router-dom'
import { PageHeader } from '../shared/components/PageHeader'
import { Badge } from '../shared/components/ui/badge'

export default function Visualizations() {
  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        title="Diagnostic"
        accent="Visualizations"
        subtitle="Advanced diagnostic plots and analytical tools."
        action={<Badge variant="warning">Coming Soon</Badge>}
      />

      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-2xl mx-auto border-2 border-primary bg-surface p-8 md:p-12 neo-shadow">
        <div className="w-20 h-20 bg-primary/10 border-2 border-primary rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-primary">monitoring</span>
        </div>

        <Badge variant="warning" className="mb-4 text-xs tracking-widest uppercase">
          Under Optimization
        </Badge>

        <h2 className="font-headline text-3xl font-black uppercase mb-4 tracking-tighter">
          Visualizations Coming Soon
        </h2>

        <p className="text-on-surface-variant font-body text-base mb-8 max-w-lg">
          We are upgrading our chart rendering engine for interactive ROC/PR curves, confusion matrices, and feature importance plots to ensure blazing fast performance.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <NavLink
            to="/compare"
            className="bg-primary text-on-primary font-headline font-bold uppercase text-xs px-6 py-3 border-2 border-primary hover:bg-primary-container hover:text-primary transition-all active:scale-95 neo-shadow"
          >
            View Leaderboard
          </NavLink>
          <NavLink
            to="/results"
            className="bg-surface text-primary font-headline font-bold uppercase text-xs px-6 py-3 border-2 border-primary hover:bg-surface-variant transition-all active:scale-95 neo-shadow"
          >
            View Reports & Predictions
          </NavLink>
        </div>
      </div>
    </div>
  )
}
