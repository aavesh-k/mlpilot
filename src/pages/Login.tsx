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
      // fetch user profile
      let user = null
      try {
        // set token temporarily to fetch me
        const tmp = { access_token: tokens.access_token, refresh_token: tokens.refresh_token }
        // store quickly so interceptor can use it for me request
        useAuthStore.getState().setAuth(tmp, null)
        user = await authApi.me()
      } catch {
        // if /me fails, keep tokens without user
      }
      setAuth(tokens, user)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setApiError(toApiError(err).message)
    }
  }

  return (
    <div className="min-h-screen bg-brutal-grid flex flex-col">
      {/* Header */}
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
          {/* Left — brand / animation */}
          <div className="relative bg-black text-white p-6 sm:p-8 lg:p-10 flex flex-col overflow-hidden">
            {/* Animated grid */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>
            {/* Floating orbs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ffd400] rounded-full blur-3xl opacity-20 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-[#c8ff00] rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0055ff] rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="inline-flex bg-[#ffd400] text-black border-2 border-black px-3 py-1 -rotate-1 w-fit mb-6">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">Secure • Private • Yours</span>
              </div>
              <h1 className="font-headline text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight mb-4">
                Welcome <br />
                <span className="bg-white text-black px-2 border-2 border-black inline-block -rotate-1">Back</span>
              </h1>
              <p className="font-mono text-xs uppercase tracking-widest text-white/70 leading-relaxed max-w-md mb-8">
                Your datasets, models and reports are now fully isolated per account. No one can see your work — not even your friends on the same link.
              </p>

              {/* Animated card stack */}
              <div className="relative w-full max-w-sm mx-auto lg:mx-0 flex-1 min-h-[220px] flex items-center justify-center">
                <div className="absolute w-64 h-40 bg-white border-[3px] border-black brutal-shadow rotate-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-black">database</span>
                </div>
                <div className="absolute w-64 h-40 bg-[#ffd400] border-[3px] border-black brutal-shadow -rotate-2 flex flex-col items-center justify-center p-4">
                  <span className="material-symbols-outlined text-4xl text-black">shield</span>
                  <span className="font-mono text-[10px] font-black uppercase mt-2">End-to-end isolated</span>
                </div>
                <div className="absolute w-64 h-40 bg-[#c8ff00] border-[3px] border-black brutal-shadow rotate-1 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center animate-bounce">
                    <span className="material-symbols-outlined text-white">lock</span>
                  </div>
                  <span className="font-mono text-xs font-black uppercase mt-2 text-black">Per-user vault</span>
                  <span className="font-mono text-[10px] text-black/60">AES • JWT • BCrypt 12</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: '256-bit', v: 'JWT' },
                  { k: '60m', v: 'Access' },
                  { k: '∞', v: 'Isolated' },
                ].map((s) => (
                  <div key={s.k} className="bg-white/10 border border-white/20 p-3 backdrop-blur">
                    <div className="font-headline font-black text-lg text-white">{s.k}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/60">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white p-6 sm:p-8 lg:p-10 flex flex-col">
            <div className="mb-6">
              <h2 className="font-headline text-3xl font-black uppercase tracking-tight">Sign In</h2>
              <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-1">Access your private workspace</p>
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
                <div className="relative">
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:bg-[#ffd400]/20 placeholder:text-black/30"
                  />
                </div>
                {errors.email && <p className="font-mono text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="font-mono text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[14px]">lock</span> Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full border-2 border-black px-4 py-3 pr-12 font-mono text-sm bg-white focus:outline-none focus:bg-[#ffd400]/20 placeholder:text-black/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black text-white border-2 border-black flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {errors.password && <p className="font-mono text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3.5 shadow-[4px_4px_0_0_#000] hover:bg-[#ffd400] hover:text-black hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In <span aria-hidden>→</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-black/10" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">or</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <NavLink
                to="/"
                className="w-full bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-xs py-3 flex items-center justify-center gap-2 hover:bg-[#c8ff00] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span> Continue as Guest (Home)
              </NavLink>

              <p className="font-mono text-xs text-center text-black/60 pt-2">
                No account?{' '}
                <NavLink to="/register" className="font-black underline decoration-2 underline-offset-2 hover:bg-[#ffd400] px-1">
                  Create one
                </NavLink>
              </p>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-black/30">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Secured with bcrypt • JWT • HTTPS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
