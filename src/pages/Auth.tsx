import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi, type User } from '../core/api/auth.api'
import { useAuthStore, rememberedEmailStorage } from '../modules/auth/store/authStore'
import { ApiError, toApiError } from '../core/api/errors'

// --- Schemas with proper UX copy ---

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
})

const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address').transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirm: z.string().min(1, 'Please confirm your password'),
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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 1024px)').matches
  })
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

function AbstractPanel() {
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const handleMove = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }
  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 50, y: 50 })}
      className="group w-full h-full bg-black relative overflow-hidden flex items-center justify-center"
    >
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="absolute w-[480px] h-[480px] blur-3xl opacity-30 transition-all duration-700 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, #ffd400 0%, transparent 58%)`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div className="relative w-[300px] h-[300px]">
        <div className="absolute -top-6 left-0 right-0 h-1.5 bg-[#ffd400] border-2 border-black" />
        <div className="absolute left-0 top-8 bottom-8 w-[74px] bg-[#c8ff00] border-[3px] border-black shadow-[3px_3px_0_0_#000] transition-transform duration-500 group-hover:-translate-y-1" />
        <div className="absolute left-[18px] top-[68px] w-14 h-14 bg-[#ffd400] border-[3px] border-black shadow-[2px_2px_0_0_#000] transition-transform duration-500 group-hover:scale-110 flex items-center justify-center">
          <span className="material-symbols-outlined text-black text-xl">bolt</span>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[190px] bg-[#0055ff] border-[3px] border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.02]">
          <div className="w-[92px] h-[112px] bg-white border-[3px] border-black flex items-center justify-center">
            <div className="w-10 h-12 bg-black flex items-center justify-center">
              <div className="w-2 h-2 bg-white animate-pulse" />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="material-symbols-outlined text-[#ffd400] text-[76px] drop-shadow-[0_1px_0_#000] animate-[spin_12s_linear_infinite]">star</span>
          </div>
        </div>
        <div className="absolute left-[58px] top-[138px] w-12 h-10 bg-[#ff0000] border-2 border-black rotate-[-12deg] flex items-center justify-center shadow-[2px_2px_0_0_#000] transition-transform duration-500 group-hover:rotate-0">
          <span className="material-symbols-outlined text-white text-[18px]">favorite</span>
        </div>
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-[#c8ff00] border-[3px] border-black flex">
          <div className="flex-1 bg-[#ffd400] border-r-[3px] border-black" />
          <div className="flex-1 bg-[#c8ff00]" />
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-[#ffd400] border-2 border-black px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest hidden sm:block">mlpilot.run</div>
    </div>
  )
}

// Friendly mapping for backend error codes
function friendlyMessage(err: ApiError): { message: string; field?: string | null; recovery?: string } {
  const code = err.code
  const field = err.field
  const msg = err.message || ''

  // Prefer backend's friendly message if it's already good
  if (msg && !msg.includes('body.') && msg.length < 120) {
    // Map known backend messages to include recovery
    if (code === 'AUTHENTICATION_ERROR' || msg.toLowerCase().includes('incorrect email')) {
      return {
        message: 'Incorrect email or password.',
        recovery: 'Double-check your credentials. After 3 failed attempts, try “Forgot password?” or check for typos.',
        field: field ?? null,
      }
    }
    if (code === 'CONFLICT' || msg.toLowerCase().includes('already exists')) {
      return {
        message: 'An account with this email already exists.',
        recovery: 'Try signing in instead, or use a different email.',
        field: 'email',
      }
    }
    if (code === 'VALIDATION_ERROR' && field) {
      return { message: msg, field, recovery: 'Please fix the highlighted field.' }
    }
    // Generic fallback with backend msg
    return { message: msg, field: field ?? null }
  }

  // Fallbacks for network/unknown
  if (code === 'ERR_NETWORK' || msg.toLowerCase().includes('network')) {
    return { message: 'Unable to connect to server.', recovery: 'Check your internet connection and try again.' }
  }
  if (err.status === 429) {
    return { message: 'Too many attempts. Please wait a moment.', recovery: 'Try again in 30 seconds or reset your password.' }
  }
  if (err.status === 401) {
    return { message: 'Incorrect email or password.', recovery: 'Check for typos, or try “Forgot password?”.' }
  }
  if (err.status === 409) {
    return { message: 'An account with this email already exists.', recovery: 'Sign in instead.' }
  }
  return { message: msg || 'Something went wrong. Please try again.', field: field ?? null }
}

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setRememberMeStore = useAuthStore((s) => s.setRememberMe)
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [showRegisterPwd, setShowRegisterPwd] = useState(false)
  const [apiError, setApiError] = useState<{ message: string; recovery?: string; field?: string | null } | null>(null)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const isLogin = mode === 'login'
  const [displayIsLogin, setDisplayIsLogin] = useState(isLogin)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    const t = setTimeout(() => setDisplayIsLogin(isLogin), 30)
    return () => clearTimeout(t)
  }, [isLogin])

  useEffect(() => {
    setApiError(null)
  }, [isLogin])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const remembered = rememberedEmailStorage.get()
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: remembered || '', password: '', rememberMe: !!remembered },
  })
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  })

  // Keep remembered email in sync
  useEffect(() => {
    if (remembered && isLogin) {
      loginForm.setValue('email', remembered)
    }
  }, [remembered, isLogin]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleApiError = (
    err: unknown,
    form: typeof loginForm | typeof registerForm,
    fallbackField?: 'email' | 'password' | 'confirm',
  ) => {
    const apiErr = toApiError(err)
    const friendly = friendlyMessage(apiErr)
    setApiError(friendly)
    // Map field errors to inline form errors — use any to handle confirm only on register
    if (friendly.field && (friendly.field === 'email' || friendly.field === 'password' || friendly.field === 'confirm')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(form as any).setError(friendly.field, { message: friendly.message })
    } else if (fallbackField && apiErr.code === 'VALIDATION_ERROR') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(form as any).setError(fallbackField, { message: friendly.message })
    }
    // Track attempts for login
    if (isLogin && apiErr.code === 'AUTHENTICATION_ERROR') {
      setLoginAttempts((c) => c + 1)
    }
  }

  const onLogin = async (data: LoginForm) => {
    setApiError(null)
    setSuccessMsg(null)
    try {
      const tokens = await authApi.login(data.email, data.password, data.rememberMe ?? false)
      setRememberMeStore(!!data.rememberMe)
      if (data.rememberMe) rememberedEmailStorage.set(data.email)
      else rememberedEmailStorage.clear()
      
      const fallbackUser: User = {
        id: '',
        email: data.email,
        created_at: new Date().toISOString(),
      }
      setAuth(tokens, fallbackUser, !!data.rememberMe)
      
      try {
        const user = await authApi.me()
        if (user) {
          setAuth(tokens, user, !!data.rememberMe)
        }
      } catch {
        // Fallback user already stored
      }
      
      setSuccessMsg('Welcome back! Redirecting…')
      setLoginAttempts(0)
      setTimeout(() => navigate(from, { replace: true }), 300)
    } catch (err: unknown) {
      handleApiError(err, loginForm, 'password')
    }
  }

  const onRegister = async (formData: RegisterForm) => {
    setApiError(null)
    setSuccessMsg(null)
    try {
      const guest = ensureGuest()
      const tokens = await authApi.register(formData.email, formData.password, guest || undefined)
      setRememberMeStore(true)
      rememberedEmailStorage.set(formData.email)
      
      const fallbackUser: User = {
        id: '',
        email: formData.email,
        created_at: new Date().toISOString(),
      }
      setAuth(tokens, fallbackUser, true)
      
      try {
        const user = await authApi.me()
        if (user) {
          setAuth(tokens, user, true)
        }
      } catch {
        // Fallback user already stored
      }
      
      try {
        localStorage.removeItem('mlpilot_guest_session')
      } catch {}
      setSuccessMsg('Account created! Welcome aboard.')
      setTimeout(() => navigate('/dashboard', { replace: true }), 300)
    } catch (err: unknown) {
      handleApiError(err, registerForm, 'email')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotStatus({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    setForgotStatus({ type: 'loading' })
    try {
      const res = await authApi.forgotPassword(forgotEmail)
      setForgotStatus({ type: 'success', message: res.message })
    } catch (err: unknown) {
      const apiErr = toApiError(err)
      const f = friendlyMessage(apiErr)
      setForgotStatus({ type: 'error', message: f.message })
    }
  }

  const handleGuest = () => {
    ensureGuest()
    navigate('/dashboard', { replace: true })
  }

  const inputBase =
    'w-full h-12 border-2 border-black bg-white px-3 font-mono text-sm tracking-widest placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-black focus-visible:shadow-[4px_4px_0_0_#ffd400] transition-all brutal-shadow-sm'

  const checkboxBase =
    'w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 transition-colors brutal-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black'

  const showRecovery = (recovery?: string) => {
    if (!recovery) return null
    return <p className="font-mono text-[10px] leading-relaxed text-black/60 mt-1">{recovery}</p>
  }

  const ErrorBanner = ({ err }: { err: { message: string; recovery?: string } | null }) => {
    if (!err) return null
    return (
      <div className="mt-4 bg-red-50 border-2 border-[#ff0000] p-3 flex gap-2 brutal-shadow-sm">
        <span className="material-symbols-outlined text-red-600 text-xl shrink-0">error</span>
        <div className="min-w-0">
          <p className="font-mono text-xs font-black text-red-700 leading-relaxed">{err.message}</p>
          {showRecovery(err.recovery)}
          {err.message.toLowerCase().includes('incorrect') && (
            <button type="button" onClick={() => setShowForgot(true)} className="mt-2 font-mono text-[11px] font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
              Forgot password?
            </button>
          )}
          {err.message.toLowerCase().includes('already exists') && (
            <button type="button" onClick={() => navigate('/login')} className="mt-2 font-mono text-[11px] font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
              Go to Sign In →
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brutal-grid flex flex-col">
      <header className="sticky top-0 z-50 border-b-[3px] border-black bg-[#c8ff00]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-black shadow-[2px_2px_0_0_#fff] sm:shadow-[3px_3px_0_0_#fff] border-2 border-black flex items-center justify-center shrink-0">
              <span className="text-[#ffd400] font-black text-lg sm:text-xl leading-none">M</span>
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-headline font-black text-lg sm:text-xl uppercase tracking-tight text-black">MLPilot</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/70 font-bold hidden sm:block">DATA → MODEL</span>
            </div>
          </NavLink>
          <NavLink to="/" className="font-mono text-xs font-black uppercase tracking-widest border-2 border-black px-4 py-2 bg-white shadow-[3px_3px_0_0_#000] hover:bg-black hover:text-white transition-colors btn-press">
            Home
          </NavLink>
        </div>
      </header>

      {successMsg && (
        <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="bg-[#c8ff00] border-2 border-black p-3 flex gap-2 brutal-shadow-sm">
            <span className="material-symbols-outlined text-black text-xl">check_circle</span>
            <p className="font-mono text-xs font-black text-black leading-relaxed">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {isDesktop ? (
          <div className="relative w-full max-w-[1000px] h-[640px] bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] overflow-hidden flex">
            <div className="flex w-full h-full">
              <div className="w-1/2 h-full bg-white p-8 flex flex-col justify-center overflow-y-auto">
                <div className="max-w-sm mx-auto w-full">
                  <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest -rotate-1 mb-2">// welcome back</div>
                  <h1 className="font-headline font-black text-2xl uppercase tracking-tight">Sign In</h1>
                  <p className="font-mono text-xs text-black/60 mt-1 tracking-widest uppercase">Welcome back</p>
                  {apiError && displayIsLogin && <ErrorBanner err={apiError} />}
                  {loginAttempts >= 2 && displayIsLogin && !apiError && (
                    <div className="mt-3 bg-amber-50 border-2 border-black p-2 brutal-shadow-sm">
                      <p className="font-mono text-[11px] font-bold text-black">Having trouble? Try “Forgot password?” or check Caps Lock.</p>
                    </div>
                  )}
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true" noValidate>
                    <div>
                      <label htmlFor="login-email" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                        Email
                      </label>
                      <input id="login-email" {...loginForm.register('email')} type="email" autoComplete="email" spellCheck={false} placeholder="you@example.com" className={`${inputBase} ${loginForm.formState.errors.email ? 'border-[#ff0000] bg-red-50' : ''}`} />
                      {loginForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-password" className="font-mono text-[11px] font-black uppercase tracking-widest block">
                          Password
                        </label>
                        <button type="button" onClick={() => setShowForgot(true)} className="font-mono text-[10px] font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="login-password"
                          {...loginForm.register('password')}
                          type={showLoginPwd ? 'text' : 'password'}
                          autoComplete="current-password"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                          placeholder="••••••••"
                          className={`${inputBase} pr-12 ${loginForm.formState.errors.password ? 'border-[#ff0000] bg-red-50' : ''}`}
                        />
                        <button
                          type="button"
                          aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                          onClick={() => setShowLoginPwd((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors brutal-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          <span className="material-symbols-outlined text-[18px]">{showLoginPwd ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {loginForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>}
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer group w-fit">
                      <input type="checkbox" {...loginForm.register('rememberMe')} className="sr-only" />
                      <div className={`${checkboxBase} ${loginForm.watch('rememberMe') ? 'bg-black text-white' : 'bg-white'}`}>
                        {loginForm.watch('rememberMe') && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                      </div>
                      <span className="font-mono text-xs font-black uppercase tracking-widest group-hover:underline">Remember me</span>
                      <span className="font-mono text-[10px] text-black/50 hidden sm:inline">— Keep me signed in</span>
                    </label>
                    <button
                      type="submit"
                      disabled={loginForm.formState.isSubmitting}
                      className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 hover:bg-black/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 brutal-shadow btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Signing in…
                        </>
                      ) : (
                        <>Sign In →</>
                      )}
                    </button>
                    <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2.5 hover:bg-[#ffd400] transition-colors brutal-shadow-sm btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                      Continue as Guest
                    </button>
                    <p className="font-mono text-xs text-center text-black/60">
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => { setApiError(null); navigate('/register') }} className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        Sign up
                      </button>
                    </p>
                  </form>
                </div>
              </div>
              <div className="w-1/2 h-full bg-white p-8 flex flex-col justify-center overflow-y-auto pt-10">
                <div className="max-w-sm mx-auto w-full">
                  <div className="inline-flex bg-[#c8ff00] border-2 border-black brutal-shadow-sm px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest -rotate-1 mb-2">// private vault</div>
                  <h1 className="font-headline font-black text-2xl uppercase tracking-tight">Create account</h1>
                  <p className="font-mono text-xs text-black/60 mt-1 tracking-widest uppercase">Private vault</p>
                  {apiError && !displayIsLogin && <ErrorBanner err={apiError} />}
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true" noValidate>
                    <div>
                      <label htmlFor="register-email" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                        Email
                      </label>
                      <input id="register-email" {...registerForm.register('email')} type="email" autoComplete="email" spellCheck={false} placeholder="you@company.com" className={`${inputBase} ${registerForm.formState.errors.email ? 'border-[#ff0000] bg-red-50' : ''}`} />
                      {registerForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.email.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="register-password" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="register-password"
                          {...registerForm.register('password')}
                          type={showRegisterPwd ? 'text' : 'password'}
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                          data-bwignore="true"
                          placeholder="Min 8, A + 0-9"
                          className={`${inputBase} pr-12 ${registerForm.formState.errors.password ? 'border-[#ff0000] bg-red-50' : ''}`}
                        />
                        <button
                          type="button"
                          aria-label={showRegisterPwd ? 'Hide password' : 'Show password'}
                          onClick={() => setShowRegisterPwd((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors brutal-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          <span className="material-symbols-outlined text-[18px]">{showRegisterPwd ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {registerForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.password.message}</p>}
                      <div className="mt-2 h-1.5 w-full border border-black bg-white overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strength <= 2 ? 'bg-[#ff0000]' : strength === 3 ? 'bg-[#ffd400]' : 'bg-black'}`} style={{ width: `${Math.min(100, (strength / 5) * 100)}%` }} />
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-black/40 mt-1">At least 8, 1 uppercase, 1 number</p>
                    </div>
                    <div>
                      <label htmlFor="register-confirm" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                        Confirm
                      </label>
                      <div className="relative">
                        <input
                          id="register-confirm"
                          {...registerForm.register('confirm')}
                          type={showRegisterPwd ? 'text' : 'password'}
                          autoComplete="new-password"
                          spellCheck={false}
                          data-lpignore="true"
                          placeholder="Repeat password"
                          className={`${inputBase} pr-12 ${registerForm.formState.errors.confirm ? 'border-[#ff0000] bg-red-50' : ''}`}
                        />
                        <button
                          type="button"
                          aria-label={showRegisterPwd ? 'Hide password' : 'Show password'}
                          onClick={() => setShowRegisterPwd((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors brutal-shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                          tabIndex={-1}
                        >
                          <span className="material-symbols-outlined text-[18px]">{showRegisterPwd ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {registerForm.formState.errors.confirm && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.confirm.message}</p>}
                    </div>
                    <button
                      type="submit"
                      disabled={registerForm.formState.isSubmitting}
                      className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 hover:bg-black/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 brutal-shadow btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      {registerForm.formState.isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Creating…
                        </>
                      ) : (
                        <>Create account →</>
                      )}
                    </button>
                    <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2.5 hover:bg-[#ffd400] transition-colors brutal-shadow-sm btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                      Continue as Guest
                    </button>
                    <p className="font-mono text-xs text-center text-black/60">
                      Already have an account?{' '}
                      <button type="button" onClick={() => { setApiError(null); navigate('/login') }} className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        Sign in
                      </button>
                    </p>
                  </form>
                </div>
              </div>
            </div>
            <div className="absolute top-0 h-full w-1/2 transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)] border-l-[3px] lg:border-l-0 border-black" style={{ transform: displayIsLogin ? 'translateX(100%)' : 'translateX(0)' }}>
              <AbstractPanel />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
            {displayIsLogin ? (
              <div className="p-6 bg-white">
                <div className="inline-flex bg-white border-2 border-black brutal-shadow-sm px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest -rotate-1 mb-3">// welcome back</div>
                <h1 className="font-headline font-black text-2xl uppercase tracking-tight">Sign In</h1>
                <p className="font-mono text-xs text-black/60 mt-1 uppercase tracking-widest">Welcome back</p>
                {apiError && <ErrorBanner err={apiError} />}
                {loginAttempts >= 2 && !apiError && (
                  <div className="mt-3 bg-amber-50 border-2 border-black p-2 brutal-shadow-sm">
                    <p className="font-mono text-[11px] font-bold text-black">Having trouble? Try “Forgot password?” or check Caps Lock.</p>
                  </div>
                )}
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true" noValidate>
                  <div>
                    <label htmlFor="m-login-email" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                      Email
                    </label>
                    <input id="m-login-email" {...loginForm.register('email')} type="email" autoComplete="email" spellCheck={false} placeholder="you@example.com" className={`${inputBase} ${loginForm.formState.errors.email ? 'border-[#ff0000] bg-red-50' : ''}`} />
                    {loginForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="m-login-password" className="font-mono text-[11px] font-black uppercase tracking-widest block">
                        Password
                      </label>
                      <button type="button" onClick={() => setShowForgot(true)} className="font-mono text-[10px] font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input id="m-login-password" {...loginForm.register('password')} type={showLoginPwd ? 'text' : 'password'} autoComplete="current-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Your password" className={`${inputBase} pr-12 ${loginForm.formState.errors.password ? 'border-[#ff0000] bg-red-50' : ''}`} />
                      <button type="button" aria-label={showLoginPwd ? 'Hide password' : 'Show password'} onClick={() => setShowLoginPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        <span className="material-symbols-outlined text-[18px]">{showLoginPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {loginForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>}
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer group w-fit">
                    <input type="checkbox" {...loginForm.register('rememberMe')} className="sr-only" />
                    <div className={`${checkboxBase} ${loginForm.watch('rememberMe') ? 'bg-black text-white' : 'bg-white'}`}>{loginForm.watch('rememberMe') && <span className="material-symbols-outlined text-[16px] text-white">check</span>}</div>
                    <span className="font-mono text-xs font-black uppercase tracking-widest group-hover:underline">Remember me</span>
                  </label>
                  <button type="submit" disabled={loginForm.formState.isSubmitting} className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 brutal-shadow btn-press hover:bg-black/90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loginForm.formState.isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Signing in…
                      </>
                    ) : (
                      <>Sign In →</>
                    )}
                  </button>
                  <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2.5 hover:bg-[#ffd400] transition-colors brutal-shadow-sm btn-press">
                    Continue as Guest
                  </button>
                  <p className="font-mono text-xs text-center text-black/60">
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={() => { setApiError(null); navigate('/register') }} className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                      Sign up
                    </button>
                  </p>
                </form>
              </div>
            ) : (
              <div className="p-6 bg-white">
                <div className="inline-flex bg-[#c8ff00] border-2 border-black brutal-shadow-sm px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest -rotate-1 mb-3">// private vault</div>
                <h1 className="font-headline font-black text-2xl uppercase tracking-tight">Create account</h1>
                <p className="font-mono text-xs text-black/60 mt-1 uppercase tracking-widest">Private vault</p>
                {apiError && <ErrorBanner err={apiError} />}
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true" noValidate>
                  <div>
                    <label htmlFor="m-register-email" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                      Email
                    </label>
                    <input id="m-register-email" {...registerForm.register('email')} type="email" autoComplete="email" spellCheck={false} placeholder="you@company.com" className={`${inputBase} ${registerForm.formState.errors.email ? 'border-[#ff0000] bg-red-50' : ''}`} />
                    {registerForm.formState.errors.email && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="m-register-password" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                      Password
                    </label>
                    <div className="relative">
                      <input id="m-register-password" {...registerForm.register('password')} type={showRegisterPwd ? 'text' : 'password'} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Min 8, A + 0-9" className={`${inputBase} pr-12 ${registerForm.formState.errors.password ? 'border-[#ff0000] bg-red-50' : ''}`} />
                      <button type="button" aria-label={showRegisterPwd ? 'Hide password' : 'Show password'} onClick={() => setShowRegisterPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        <span className="material-symbols-outlined text-[18px]">{showRegisterPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {registerForm.formState.errors.password && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.password.message}</p>}
                    <div className="mt-2 h-1.5 w-full border border-black bg-white overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength <= 2 ? 'bg-[#ff0000]' : strength === 3 ? 'bg-[#ffd400]' : 'bg-black'}`} style={{ width: `${Math.min(100, (strength / 5) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="m-register-confirm" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                      Confirm
                    </label>
                    <div className="relative">
                      <input id="m-register-confirm" {...registerForm.register('confirm')} type={showRegisterPwd ? 'text' : 'password'} autoComplete="new-password" spellCheck={false} placeholder="Repeat" className={`${inputBase} pr-12 ${registerForm.formState.errors.confirm ? 'border-[#ff0000] bg-red-50' : ''}`} />
                      <button type="button" aria-label={showRegisterPwd ? 'Hide password' : 'Show password'} onClick={() => setShowRegisterPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black" tabIndex={-1}>
                        <span className="material-symbols-outlined text-[18px]">{showRegisterPwd ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {registerForm.formState.errors.confirm && <p className="font-mono text-xs text-red-600 mt-1">{registerForm.formState.errors.confirm.message}</p>}
                  </div>
                  <button type="submit" disabled={registerForm.formState.isSubmitting} className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 brutal-shadow btn-press hover:bg-black/90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {registerForm.formState.isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Creating…
                      </>
                    ) : (
                      <>Create account →</>
                    )}
                  </button>
                  <button type="button" onClick={handleGuest} className="w-full bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2.5 hover:bg-[#ffd400] transition-colors brutal-shadow-sm btn-press">
                    Continue as Guest
                  </button>
                  <p className="font-mono text-xs text-center text-black/60">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setApiError(null); navigate('/login') }} className="font-black underline decoration-2 underline-offset-4 hover:bg-black hover:text-white px-1 transition-colors">
                      Sign in
                    </button>
                  </p>
                </form>
              </div>
            )}
            <div className="flex border-t-[3px] border-black">
              <button onClick={() => { setApiError(null); navigate('/login') }} className={`flex-1 py-3 text-center font-mono text-xs font-black uppercase tracking-widest transition-colors btn-press border-r-2 border-black ${displayIsLogin ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#ffd400]'}`}>
                Sign in
              </button>
              <button onClick={() => { setApiError(null); navigate('/register') }} className={`flex-1 py-3 text-center font-mono text-xs font-black uppercase tracking-widest transition-colors btn-press ${!displayIsLogin ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#ffd400]'}`}>
                Sign up
              </button>
            </div>
          </div>
        )}
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowForgot(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
            <div className="bg-[#ffd400] border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
              <h2 className="font-headline font-black text-xl uppercase tracking-tight">Reset password</h2>
              <button onClick={() => setShowForgot(false)} className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors brutal-shadow-sm">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleForgot} className="p-6 space-y-4">
              <p className="font-mono text-xs leading-relaxed text-black/60">Enter your email and we’ll send a reset link if an account exists. Check spam too.</p>
              <div>
                <label htmlFor="forgot-email" className="font-mono text-[11px] font-black uppercase tracking-widest mb-1.5 block">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${inputBase} ${forgotStatus.type === 'error' ? 'border-[#ff0000] bg-red-50' : ''}`}
                  autoComplete="email"
                />
              </div>
              {forgotStatus.type === 'error' && <p className="font-mono text-xs text-red-600">{forgotStatus.message}</p>}
              {forgotStatus.type === 'success' && (
                <div className="bg-[#c8ff00] border-2 border-black p-3 brutal-shadow-sm">
                  <p className="font-mono text-xs font-black text-black leading-relaxed">{forgotStatus.message}</p>
                  <p className="font-mono text-[10px] text-black/60 mt-1">For this demo, reset is simulated. Try signing in again.</p>
                </div>
              )}
              <button
                type="submit"
                disabled={forgotStatus.type === 'loading'}
                className="w-full bg-black text-white border-2 border-black font-mono font-black uppercase tracking-widest text-sm py-3 brutal-shadow btn-press hover:bg-black/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {forgotStatus.type === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> Sending…
                  </>
                ) : (
                  <>Send reset link →</>
                )}
              </button>
              <button type="button" onClick={() => setShowForgot(false)} className="w-full bg-white text-black border-2 border-black font-mono text-xs font-black uppercase tracking-widest py-2.5 hover:bg-[#ffd400] transition-colors brutal-shadow-sm btn-press">
                Back to Sign In
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
