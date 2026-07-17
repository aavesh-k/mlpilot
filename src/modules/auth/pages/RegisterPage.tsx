import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '../../../shared/schemas/auth'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('')
    setLoading(true)
    try {
      await registerUser(data)
      navigate('/auth')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-background font-body text-primary">
      <section className="relative w-full md:w-1/2 lg:w-3/5 bg-primary overflow-hidden flex items-center justify-center p-12 border-b-4 md:border-b-0 md:border-r-4 border-primary">
        <div className="relative z-10 w-full max-w-xl">
          <div className="flex flex-col gap-0">
            <h1 className="font-headline font-black text-7xl md:text-9xl leading-[0.8] tracking-tighter text-background mb-4">
              ML<br />PILOT
            </h1>
            <div className="h-4 w-48 bg-primary-container mb-8 border-2 border-primary" />
            <div className="grid grid-cols-3 gap-4">
              <div className="aspect-square bg-secondary border-4 border-primary flex items-center justify-center rotate-3 neo-shadow">
                <span className="material-symbols-outlined text-background text-6xl">model_training</span>
              </div>
              <div className="aspect-square bg-primary-container border-4 border-primary rounded-full flex items-center justify-center -rotate-6 neo-shadow">
                <span className="material-symbols-outlined text-primary text-6xl">database</span>
              </div>
              <div className="aspect-square bg-tertiary border-4 border-primary flex items-center justify-center rotate-12 neo-shadow">
                <span className="material-symbols-outlined text-background text-6xl">leaderboard</span>
              </div>
            </div>
            <p className="font-headline font-bold text-2xl text-background mt-12 max-w-md uppercase leading-none">
              Join the network.<br />Initialize your node.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center items-center p-8 md:p-16 bg-background">
        <div className="w-full max-w-sm">
          <h2 className="font-headline text-4xl font-black tracking-tighter mb-8 text-center md:text-left">
            Register
          </h2>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {serverError && (
              <div className="bg-secondary/10 border-2 border-secondary p-4">
                <p className="font-headline font-bold text-sm text-secondary">{serverError}</p>
              </div>
            )}

            <div>
              <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="user@mlpilot.io"
                {...register('email')}
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-secondary font-headline font-bold text-xs">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="reg-username">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                placeholder="engineer42"
                {...register('username')}
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
              />
              {errors.username && (
                <p className="mt-1 text-secondary font-headline font-bold text-xs">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="Min 8 chars, upper, lower, digit"
                {...register('password')}
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
              />
              {errors.password && (
                <p className="mt-1 text-secondary font-headline font-bold text-xs">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="reg-password-confirm">
                Confirm Password
              </label>
              <input
                id="reg-password-confirm"
                type="password"
                placeholder="Re-enter password"
                {...register('password_confirm')}
                className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
              />
              {errors.password_confirm && (
                <p className="mt-1 text-secondary font-headline font-bold text-xs">{errors.password_confirm.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-background border-2 border-primary py-4 px-6 font-headline font-black text-xl uppercase flex items-center justify-center gap-3 neo-shadow hover:bg-primary-container hover:text-primary transition-all active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Initialize Node'}
              <span className="material-symbols-outlined">person_add</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-on-surface-variant font-medium">
              Already have an account?{' '}
              <NavLink to="/auth" className="font-headline font-bold text-tertiary uppercase underline decoration-2 underline-offset-4 hover:text-primary">
                Sign In
              </NavLink>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
