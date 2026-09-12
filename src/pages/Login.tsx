import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../core/api/auth.api'
import { useAuthStore } from '../modules/auth/store/authStore'
import { toApiError } from '../core/api/errors'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

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

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const onSubmit = async (data: LoginForm) => {
    setApiError(null)
    try {
      const tokens = await authApi.login(data.email, data.password)
      useAuthStore.getState().setAuth(tokens, null)
      let user = null
      try {
        user = await authApi.me()
      } catch {}
      setAuth(tokens, user)
      navigate(from, { replace: true })
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
          {/* Left — editorial */}
          <div className="bg-white p-8 lg:p-10 flex flex-col border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-black">
            <div className="inline-flex items-center gap-2 border-2 border-black px-3 py-1.5 bg-[#ffd400] w-fit">
              <span className="w-2 h-2 bg-black animate-pulse" />
              <span className="font-mono text-[10px] font-black uppercase tracking-widest">Secure workspace</span>
            </div>

            <h1 className="font-headline font-black text-4xl leading-none tracking-tight mt-6">
              Sign in to
              <br />
              your vault
            </h1>
            <p className="font-mono text-xs leading-relaxed text-black/60 mt-3 max-w-sm">
              Each account is fully isolated. Your datasets and models stay private to you.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { t: 'Private by default', d: 'No shared tables — your data never leaves your account.' },
                { t: 'Fast access', d: 'JWT with 60m access, 7d refresh. Stay signed in across tabs.' },
                { t: 'Try without account', d: 'Guest mode keeps a local browser session for demos.' },
              ].map((f) => (
                <div key={f.t} className="flex gap-3 border-2 border-black p-3 bg-[#f8f8f6]">
                  <span className="w-8 h-8 bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </span>
                  <div>
                    <div className="font-mono text-xs font-black uppercase tracking-widest">{f.t}</div>
                    <div className="font-mono text-[11px] text-black/60 leading-relaxed">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-black/40">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">lock</span> Encrypted
              </span>
              <span className="w-1 h-1 bg-black/20" />
              <span>Isolated</span>
              <span className="w-1 h-1 bg-black/20" />
              <span>Private</span>
            </div>
          </div>

          {/* Right — form */}
          <div className="p-8 lg:p-10 bg-[#f8f8f6]">
            <div className="bg-white border-2 border-black p-6 sm:p-7 shadow-[4px_4px_0_0_#000]">
              <h2 className="font-headline font-black text-2xl uppercase tracking-tight">Welcome back</h2>
              <p className="font-mono text-xs text-black/60 mt-1">Enter your credentials to continue</p>

              {apiError && (
                <div className="mt-4 bg-red-50 border-2 border-black p-3 flex gap-2">
                  <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                  <p className="font-mono text-xs font-bold text-red-700 leading-relaxed">{apiError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    Email
                  </label>
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
                  <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
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
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3.5 hover:bg-white hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    <>Sign in →</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGuest}
                  className="w-full bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-xs py-3 hover:bg-[#ffd400] transition-colors"
                >
                  Continue as Guest
                </button>

                <p className="font-mono text-xs text-center text-black/60 pt-2">
                  No account?{' '}
                  <NavLink to="/register" className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                    Create one
                  </NavLink>
                </p>
              </form>
            </div>

            <p className="font-mono text-[10px] text-center text-black/30 mt-4">Protected by JWT • Bcrypt 12 • HTTPS</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateY(6px)} to {opacity:1; transform: translateY(0)}}`}</style>
    </div>
  )
}
