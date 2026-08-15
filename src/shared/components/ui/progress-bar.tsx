interface ProgressBarProps {
  /** Completion percentage, 0–100. */
  value: number
  /** When true (e.g. job is running), shows a moving shimmer overlay to signal activity. */
  active?: boolean
  /** Tailwind height class for the track. */
  heightClass?: string
  className?: string
}

/**
 * Neo-brutalist progress bar.
 *
 * The fill width is CSS-transitioned so the bar eases toward new values
 * instead of snapping, and an indeterminate shimmer is shown while `active`
 * to make a stalled-but-running job look alive rather than frozen.
 */
export function ProgressBar({
  value,
  active = false,
  heightClass = 'h-4',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      className={`relative overflow-hidden border-2 border-primary bg-surface-variant ${heightClass} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-secondary transition-all duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      />
      {active && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-indeterminate absolute inset-y-0 w-1/3 bg-white/30" />
        </div>
      )}
    </div>
  )
}
