import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../modules/auth/store/authStore'

export function useIsGuest(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  return !isAuthenticated || !user
}

interface GuestBannerProps {
  feature?: string
  description?: string
  className?: string
  compact?: boolean
}

export function GuestBanner({
  feature = 'this feature',
  description = 'Guests can explore demo datasets and preview reports. Create a free account to upload custom datasets, run automated data cleaning, build preprocessing pipelines, and train models.',
  className = '',
  compact = false,
}: GuestBannerProps) {
  const isGuest = useIsGuest()
  if (!isGuest) return null

  if (compact) {
    return (
      <div className={`bg-[#ffd400]/20 border-2 border-black p-3 brutal-shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-black text-xl shrink-0">info</span>
          <p className="font-mono text-xs font-bold text-black leading-snug">
            Guest Mode: Sign up to unlock <span className="underline">{feature}</span>.
          </p>
        </div>
        <NavLink
          to="/register"
          className="bg-black text-white font-mono text-xs font-black uppercase tracking-widest px-3 py-1.5 border border-black hover:bg-[#ffd400] hover:text-black transition-colors whitespace-nowrap text-center btn-press shrink-0"
        >
          Sign Up Free →
        </NavLink>
      </div>
    )
  }

  return (
    <div className={`bg-amber-50 border-2 border-black p-4 sm:p-5 brutal-shadow ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[#ffd400] border-2 border-black flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-black text-lg font-bold">lock</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex bg-white border border-black px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest -rotate-1 mb-1.5">
            // Guest Preview Mode
          </div>
          <h4 className="font-headline font-black text-base uppercase tracking-tight text-black">
            Sign Up to Unlock {feature}
          </h4>
          <p className="font-mono text-xs text-black/75 mt-1 leading-relaxed">
            {description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <NavLink
              to="/register"
              className="bg-black text-white font-mono text-xs font-black uppercase tracking-widest px-4 py-2 border-2 border-black hover:bg-[#ffd400] hover:text-black transition-colors btn-press inline-flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
            >
              <span>Create Free Account</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </NavLink>
            <NavLink
              to="/login"
              className="bg-white text-black font-mono text-xs font-black uppercase tracking-widest px-3 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors btn-press inline-flex items-center"
            >
              Sign In
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}
