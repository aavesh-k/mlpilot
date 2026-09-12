import { useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../core/api/auth.api'
import { useAuthStore } from '../modules/auth/store/authStore'
import { toApiError } from '../core/api/errors'

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email').transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Need one uppercase letter')
      .regex(/\d/, 'Need one number'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const pwd = watch('password') || ''

  const strength = useMemo(() => {
    let s = 0
    if (pwd.length >= 8) s++
    if (/[A-Z]/.test(pwd)) s++
    if (/\d/.test(pwd)) s++
    if (/[^A-Za-z0-9]/.test(pwd)) s++
    if (pwd.length >= 12) s++
    return s // 0..5
  }, [pwd])

  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][Math.max(0, Math.min(4, strength - 1))] || '—'
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-[#c8ff00]', 'bg-[#0055ff]'][Math.max(0, Math.min(4, strength - 1))] || 'bg-black/10'

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null)
    try {
      const tokens = await authApi.register(data.email, data.password)
      let user = null
      try {
        useAuthStore.getState().setAuth(tokens, null)
        user = await authApi.me()
      } catch {}
      setAuth(tokens, user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setApiError(toApiError(err).message)
    }
  }

  return (
    <div className="min-h-screen bg-brutal-grid flex flex-col">
      <header className="border-b-[3px] border-black bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#000]">
              <span className="text-[#ffd400] font-black text-xl">M</span>
            </div>
            <span className="font-headline font-black text-xl uppercase tracking-tight">MLPilot</span>
          </NavLink>
          <NavLink to="/" className="font-mono text-xs font-black uppercase tracking-widest border-2 border-black px-4 py-2 bg-white hover:bg-[#ffd400] transition-colors">
            ← Back to Home
          </NavLink>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-0 border-[3px] border-black brutal-shadow-xl bg-white overflow-hidden">
          {/* Left */}
          <div className="relative bg-[#0055ff] text-white p-6 sm:p-8 lg:p-10 flex flex-col overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#ffd400] rounded-full blur-3xl opacity-20 animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-white rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="inline-flex bg-white text-black border-2 border-black px-3 py-1 -rotate-1 w-fit mb-6">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">Create • Secure • Isolated</span>
              </div>
              <h1 className="font-headline text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight mb-4">
                Join <br />
                <span className="bg-[#ffd400] text-black px-2 border-2 border-black inline-block rotate-1">MLPilot</span>
              </h1>
              <p className="font-mono text-xs uppercase tracking-widest text-white/80 leading-relaxed max-w-md mb-6">
                One account = one private vault. Your uploads, pipelines and leaderboard are invisible to everyone else.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'Per-user isolation — no peeking',
                  '60m access + 7d refresh JWT',
                  'Bcrypt 12 + case-insensitive email',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest">
                    <span className="w-6 h-6 bg-[#c8ff00] border-2 border-black text-black flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="relative w-full max-w-sm mx-auto lg:mx-0 flex-1 min-h-[180px] flex items-center justify-center">
                <div className="absolute w-60 h-36 bg-white border-[3px] border-black brutal-shadow -rotate-2 flex items-center justify-center">
                  <span className="font-mono text-[10px] font-black uppercase">your data</span>
                </div>
                <div className="absolute w-60 h-36 bg-black border-[3px] border-black brutal-shadow rotate-3 flex flex-col items-center justify-center text-white">
                  <span className="material-symbols-outlined text-3xl">encrypted</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest mt-1 text-white/70">encrypted at rest</span>
                </div>
                <div className="absolute w-60 h-36 bg-[#ffd400] border-[3px] border-black brutal-shadow -rotate-1 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">person</span>
                  <span className="font-mono text-xs font-black uppercase">You only</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right form */}
          <div className="bg-white p-6 sm:p-8 lg:p-10 flex flex-col">
            <div className="mb-6">
              <h2 className="font-headline text-3xl font-black uppercase tracking-tight">Create Account</h2>
              <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-1">Start your private workspace</p>
            </div>

            {apiError && (
              <div className="mb-4 bg-red-50 border-2 border-red-500 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                <p className="font-mono text-xs font-bold text-red-700 leading-relaxed">{apiError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">mail</span> Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:bg-[#ffd400]/20 placeholder:text-black/30"
                />
                {errors.email && <p className="font-mono text-xs text-red-600 mt-1">{errors.email.message}</p>}
                <p className="font-mono text-[10px] text-black/40 mt-1">Lowercased — case-insensitive</p>
              </div>

              <div>
                <label className="font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">lock</span> Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min 8, 1 uppercase + 1 number"
                    className="w-full border-2 border-black px-4 py-3 pr-12 font-mono text-sm bg-white focus:outline-none focus:bg-[#ffd400]/20 placeholder:text-black/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black text-white border-2 border-black flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                    aria-label={showPwd ? 'Hide' : 'Show'}
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {errors.password && <p className="font-mono text-xs text-red-600 mt-1">{errors.password.message}</p>}
                {/* Strength */}
                <div className="mt-2">
                  <div className="h-2 w-full border border-black bg-white flex overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${strengthColor}`} style={{ width: `${Math.min(100, (strength / 5) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mt-1">
                    <span className="text-black/60">Strength: {strengthLabel}</span>
                    <span className="hidden sm:inline text-black/40">8+ chars • A • 0-9</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">verified</span> Confirm Password
                </label>
                <input
                  {...register('confirm')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:bg-[#ffd400]/20 placeholder:text-black/30"
                />
                {errors.confirm && <p className="font-mono text-xs text-red-600 mt-1">{errors.confirm.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0055ff] text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3.5 shadow-[4px_4px_0_0_#000] hover:bg-black hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>Create Account →</>
                )}
              </button>

              <p className="font-mono text-xs text-center text-black/60">
                Already have an account?{' '}
                <NavLink to="/login" className="font-black underline decoration-2 underline-offset-2 hover:bg-[#ffd400] px-1">
                  Sign in
                </NavLink>
              </p>

              <p className="font-mono text-[10px] text-center text-black/40 leading-relaxed pt-2">
                By creating an account you agree to per-user isolation. No one else can see your datasets or models.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
