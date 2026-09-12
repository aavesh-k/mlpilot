import { useState, useMemo, useEffect } from 'react'
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

const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email').transform((v) => v.toLowerCase().trim()),
    password: z.string().min(8, 'At least 8').regex(/[A-Z]/, 'Need uppercase').regex(/\d/, 'Need number'),
    confirm: z.string().min(1, 'Confirm password'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

function ensureGuest() {
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

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const isLogin = mode === 'login'
  const [displayIsLogin, setDisplayIsLogin] = useState<boolean>(!isLogin)

  useEffect(() => {
    const t = setTimeout(() => setDisplayIsLogin(isLogin), 30)
    return () => clearTimeout(t)
  }, [isLogin])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })
  const pwd = registerForm.watch('password') || ''
  const strength = useMemo(() => {
    let s = 0
    if (pwd.length >= 8) s++
    if (/[A-Z]/.test(pwd)) s++
    if (/\d/.test(pwd)) s++
    if (/[^A-Za-z0-9]/.test(pwd)) s++
    if (pwd.length >= 12) s++
    return s
  }, [pwd])

  const onLogin = async (data: LoginForm) => {
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

  const onRegister = async (formData: RegisterForm) => {
    setApiError(null)
    try {
      const guest = ensureGuest()
      // Send guest session to migrate all 3 demos + any guest datasets
      const tokens = await (async () => {
        const { apiClient } = await import('../core/api/client')
        const { data: respData } = await apiClient.post('/auth/register', {
          email: formData.email,
          password: formData.password,
          guest_session_id: guest || undefined,
        })
        return respData
      })()
      useAuthStore.getState().setAuth(tokens, null)
      let user = null
      try {
        user = await authApi.me()
      } catch {}
      setAuth(tokens, user)
      try {
        localStorage.removeItem('mlpilot_guest_session')
      } catch {}
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setApiError(toApiError(err).message)
    }
  }

  const handleGuest = () => {
    ensureGuest()
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

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-5xl h-[560px] sm:h-[520px] bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] overflow-hidden flex">
          {/* Forms container */}
          <div className="absolute inset-0 flex transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]" style={{ transform: displayIsLogin ? 'translateX(0)' : 'translateX(-50%)', width: '200%' }}>
            {/* Login form */}
            <div className="w-1/2 h-full p-6 sm:p-8 lg:p-10 bg-[#f8f8f6] flex flex-col justify-center">
              <div className="max-w-sm mx-auto w-full">
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight">Welcome back</h2>
                <p className="font-mono text-xs text-black/60 mt-1">Sign in to continue</p>
                {apiError && isLogin && (
                  <div className="mt-4 bg-red-50 border-2 border-black p-3 flex gap-2">
                    <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                    <p className="font-mono text-xs font-bold text-red-700 leading-relaxed">{apiError}</p>
                  </div>
                )}
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4">
                  <div>
                    <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Email</label>
                    <input {...loginForm.register('email')} type="email" placeholder="you@company.com" className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30" />
                    {loginForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Password</label>
                    <div className="relative">
                      <input {...loginForm.register('password')} type={showPwd ? 'text' : 'password'} placeholder="••••••••" className="w-full border-2 border-black px-4 py-3 pr-12 font-mono text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30" />
                      <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {loginForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>}
                  </div>
                  <button type="submit" disabled={loginForm.formState.isSubmitting} className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 hover:bg-white hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Signing in…
                      </>
                    ) : (
                      <>Sign in →</>
                    )}
                  </button>
                  <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-xs py-3 hover:bg-[#ffd400] transition-colors">
                    Continue as Guest
                  </button>
                </form>
              </div>
            </div>

            {/* Register form */}
            <div className="w-1/2 h-full p-6 sm:p-8 lg:p-10 bg-[#f8f8f6] flex flex-col justify-center">
              <div className="max-w-sm mx-auto w-full">
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight">Create account</h2>
                <p className="font-mono text-xs text-black/60 mt-1">Private vault, no sharing</p>
                {apiError && !isLogin && (
                  <div className="mt-4 bg-red-50 border-2 border-black p-3 flex gap-2">
                    <span className="material-symbols-outlined text-red-600 text-xl">error</span>
                    <p className="font-mono text-xs font-bold text-red-700 leading-relaxed">{apiError}</p>
                  </div>
                )}
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4">
                  <div>
                    <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Email</label>
                    <input {...registerForm.register('email')} type="email" placeholder="you@company.com" className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30" />
                    {registerForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Password</label>
                    <div className="relative">
                      <input {...registerForm.register('password')} type={showPwd ? 'text' : 'password'} placeholder="Min 8, A + 0-9" className="w-full border-2 border-black px-4 py-3 pr-12 font-mono text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30" />
                      <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {registerForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.password.message}</p>}
                    <div className="mt-2 h-1.5 w-full border border-black bg-white overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-yellow-500' : 'bg-black'}`} style={{ width: `${Math.min(100, (strength / 5) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">Confirm</label>
                    <input {...registerForm.register('confirm')} type={showPwd ? 'text' : 'password'} placeholder="Repeat password" className="w-full border-2 border-black px-4 py-3 font-mono text-sm bg-white focus:outline-none focus:shadow-[2px_2px_0_0_#000] placeholder:text-black/30" />
                    {registerForm.formState.errors.confirm && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.confirm.message}</p>}
                  </div>
                  <button type="submit" disabled={registerForm.formState.isSubmitting} className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 hover:bg-white hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {registerForm.formState.isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Creating…
                      </>
                    ) : (
                      <>Create account →</>
                    )}
                  </button>
                  <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono font-black uppercase tracking-widest text-xs py-3 hover:bg-[#ffd400] transition-colors">
                    Continue as Guest
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Overlay — slides over inactive side */}
          <div
            className="absolute top-0 h-full w-1/2 bg-black text-white flex flex-col p-8 lg:p-10 transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)] hidden lg:flex"
            style={{ transform: displayIsLogin ? 'translateX(100%)' : 'translateX(0)' }}
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-black text-2xl">{displayIsLogin ? 'lock' : 'person_add'}</span>
              </div>
              <h3 className="font-headline font-black text-3xl leading-none uppercase tracking-tight">
                {displayIsLogin ? (
                  <>
                    New
                    <br />
                    here?
                  </>
                ) : (
                  <>
                    One of
                    <br />
                    us?
                  </>
                )}
              </h3>
              <p className="font-mono text-xs leading-relaxed text-white/60 mt-3 max-w-[260px]">
                {displayIsLogin ? 'Create an account to keep your work private and synced.' : 'Sign in to access your vault.'}
              </p>
              <NavLink
                to={displayIsLogin ? '/register' : '/login'}
                className="mt-6 inline-flex items-center justify-center border-2 border-white px-6 py-3 font-mono text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors w-fit"
              >
                {displayIsLogin ? 'Create account' : 'Sign in'}
              </NavLink>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-2">
              <span className="w-1 h-1 bg-white/30" /> Private • Isolated
            </div>
          </div>

          {/* Mobile switch */}
          <div className="absolute bottom-0 left-0 right-0 lg:hidden flex border-t-2 border-black bg-white">
            <NavLink to="/login" className={`flex-1 py-3 text-center font-mono text-xs font-black uppercase tracking-widest ${isLogin ? 'bg-black text-white' : 'bg-white text-black'}`}>
              Sign in
            </NavLink>
            <NavLink to="/register" className={`flex-1 py-3 text-center font-mono text-xs font-black uppercase tracking-widest ${!isLogin ? 'bg-black text-white' : 'bg-white text-black'}`}>
              Sign up
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}
