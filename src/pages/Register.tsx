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
    password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Need one uppercase').regex(/\d/, 'Need one number'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type RegisterForm = z.infer<typeof registerSchema>

function ensureGuestSession() {
  try {
    let g = localStorage.getItem('mlpilot_guest_session')
    if (!g) {
      g = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
      localStorage.setItem('mlpilot_guest_session', g)
    }
    return g
  } catch {
    return null
  }
}

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
    return s
  }, [pwd])
  const strengthPct = Math.min(100, (strength / 5) * 100)
  const strengthLabel = strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : strength === 4 ? 'Strong' : 'Very strong'
  const strengthColor = strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-yellow-500' : 'bg-black'

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null)
    try {
      const tokens = await authApi.register(data.email, data.password)
      useAuthStore.getState().setAuth(tokens, null)
      let user = null
      try {
        user = await authApi.me()
      } catch {}
      setAuth(tokens, user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setApiError(toApiError(err).message)
    }
  }

  const handleGuest = () => {
    ensureGuestSession()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex flex-col">
      <header className="border-b-[3px] border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
              <span className="text-white font-black text-xl">M</span>
            </div>
            <span className="font-headline font-black text-xl uppercase tracking-tight">MLPilot</span>
          </NavLink>
          <NavLink to="/" className="font-mono text-xs font-bold uppercase tracking-widest border-2 border-black px-4 py-2 bg-white hover:bg-black hover:text-white transition-colors">
            Home
          </NavLink>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] overflow-hidden animate-[fadeIn_0.4s_ease]">
          <div className="bg-[#111] text-white p-8 lg:p-10 flex flex-col">
            <div className="inline-flex items-center gap-2 border-2 border-white/20 px-3 py-1.5 bg-white/10 w-fit">
              <span className="w-2 h-2 bg-[#ffd400] animate-pulse" />
              <span className="font-mono text-[10px] font-black uppercase tracking-widest">Private workspace</span>
            </div>
            <h1 className="font-headline font-black text-4xl leading-none tracking-tight mt-6">
              Create
              <br />
              your account
            </h1>
            <p className="font-mono text-xs leading-relaxed text-white/60 mt-3 max-w-sm">
              Start in seconds. Isolated vault, no shared data — your work stays yours.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { t: 'Email is unique', d: 'Lowercased and checked — one account per email.' },
                { t: 'Strong password', d: 'Min 8, one uppercase + one number. Bcrypt 12.' },
                { t: 'Stay signed in', d: 'Across tabs via secure JWT. Guest demo available.' },
              ].map((f) => (
                <div key={f.t} className="flex gap-3 border border-white/10 p-3 bg-white/[0.04]">
                  <span className="w-8 h-8 bg-white text-black flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </span>
                  <div>
                    <div className="font-mono text-xs font-black uppercase tracking-widest">{f.t}</div>
                    <div className="font-mono text-[11px] text-white/60 leading-relaxed">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Private • Encrypted • Isolated
            </div>
          </div>

          <div className="p-8 lg:p-10 bg-[#f8f8f6]">
            <div className="bg-white border-2 border-black p-6 sm:p-7 shadow-[4px_4px_0_0_#000]">
              <h2 className="font-headline font-black text-2xl uppercase tracking-tight">Join MLPilot</h2>
              <p className="font-mono text-xs text-black/60 mt-1">Create your private vault</p>

              {apiError && (
                <div className="mt-4 bg-red-50 border-2 border-black p-3 flex gap-2">
                  <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                  <p className="font-mono text-xs font-bold text-red-700 leading-relaxed">{apiError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:border-black focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30 transition-shadow"
                  />
                  {errors.email && <p className="font-mono text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min 8, 1 uppercase + 1 number"
                      className="w-full border-2 border-black px-4 py-3 pr-12 font-mono text-sm bg-white focus:outline-none focus:border-black focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                      aria-label={showPwd ? 'Hide' : 'Show'}
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <p className="font-mono text-xs text-red-600 mt-1">{errors.password.message}</p>}
                  <div className="mt-2">
                    <div className="h-2 w-full border border-black bg-white overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${strengthPct}%` }} />
                    </div>
                    <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mt-1 text-black/60">
                      <span>Strength: {strengthLabel}</span>
                      <span className="hidden sm:inline">8+ • A • 0-9</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Confirm password</label>
                  <input
                    {...register('confirm')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:border-black focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30 transition-shadow"
                  />
                  {errors.confirm && <p className="font-mono text-xs text-red-600 mt-1">{errors.confirm.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3.5 hover:bg-white hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    <>Create account →</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGuest}
                  className="w-full bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-xs py-3 hover:bg-[#ffd400] transition-colors"
                >
                  Continue as Guest
                </button>

                <p className="font-mono text-xs text-center text-black/60">
                  Have an account?{' '}
                  <NavLink to="/login" className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                    Sign in
                  </NavLink>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateY(6px)} to {opacity:1; transform: translateY(0)}}`}</style>
    </div>
  )
}
