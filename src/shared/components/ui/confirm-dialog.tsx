import { type ReactNode, useEffect } from 'react'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] w-full max-w-md overflow-hidden animate-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between bg-[#ffd400] border-b-[3px] border-black px-6 py-4">
          <h3 className="font-mono text-xs font-black uppercase tracking-widest text-black">// {title}</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 bg-white border-2 border-black brutal-shadow-sm hover:bg-red-500 hover:text-white flex items-center justify-center font-mono font-black transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-black/70 leading-relaxed mb-8">{message}</div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
