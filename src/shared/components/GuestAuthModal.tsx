import { useNavigate } from 'react-router-dom'

interface GuestAuthModalProps {
  open: boolean
  onClose: () => void
  actionName?: string
  description?: string
}

export function GuestAuthModal({
  open,
  onClose,
  actionName = 'use this feature',
  description = 'Guests can explore demo datasets and preview reports. Create a free account to upload custom files, run data cleaning, train models, and export results.',
}: GuestAuthModalProps) {
  const navigate = useNavigate()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative bg-white border-[3px] border-black p-6 sm:p-8 max-w-md w-full brutal-shadow z-10 animate-[scaleIn_0.15s_ease-out]">
        <div className="inline-flex bg-[#ffd400] border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest -rotate-1 mb-3">
          // Account Required
        </div>
        <h3 className="font-headline font-black text-2xl uppercase tracking-tight text-black">
          Unlock {actionName}
        </h3>
        <p className="font-mono text-xs text-black/70 mt-2 leading-relaxed">
          {description}
        </p>

        <div className="my-5 border-2 border-black bg-amber-50 p-3.5 space-y-2">
          <p className="font-mono text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-black">check_circle</span>
            Available to guests:
          </p>
          <ul className="font-mono text-[11px] text-black/80 space-y-1 list-disc list-inside">
            <li>Load & inspect sample demo datasets</li>
            <li>Interactive Exploratory Data Analysis (EDA)</li>
            <li>Preview automated cleaning recommendations</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <button
            onClick={() => {
              onClose()
              navigate('/register')
            }}
            className="flex-1 bg-black text-white font-mono text-xs font-black uppercase tracking-widest py-3 border-2 border-black hover:bg-[#ffd400] hover:text-black transition-colors btn-press shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-1.5"
          >
            <span>Create Free Account</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <button
            onClick={onClose}
            className="bg-white text-black font-mono text-xs font-black uppercase tracking-widest px-4 py-3 border-2 border-black hover:bg-black/5 transition-colors btn-press"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}
