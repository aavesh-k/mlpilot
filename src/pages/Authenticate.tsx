import { useState } from "react"
import { NavLink } from "react-router-dom"

export default function Authenticate() {
  const [tab, setTab] = useState<"signin" | "signup">("signin")

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
                <span className="material-symbols-outlined text-background text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>model_training</span>
              </div>
              <div className="aspect-square bg-primary-container border-4 border-primary rounded-full flex items-center justify-center -rotate-6 neo-shadow">
                <span className="material-symbols-outlined text-primary text-6xl">database</span>
              </div>
              <div className="aspect-square bg-tertiary border-4 border-primary flex items-center justify-center rotate-12 neo-shadow">
                <span className="material-symbols-outlined text-background text-6xl">leaderboard</span>
              </div>
            </div>
            <p className="font-headline font-bold text-2xl text-background mt-12 max-w-md uppercase leading-none">
              Form follows function.<br />Intelligence follows data.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center items-center p-8 md:p-16 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex gap-4 mb-12">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-3 border-2 border-primary font-headline font-bold text-lg transition-all cursor-pointer ${
                tab === "signin" ? "bg-primary-container shadow-[4px_4px_0px_0px_#1a1a1a] translate-x-[-2px] translate-y-[-2px]" : "hover:bg-surface-container"
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-3 border-2 border-primary font-headline font-bold text-lg transition-all cursor-pointer ${
                tab === "signup" ? "bg-primary-container shadow-[4px_4px_0px_0px_#1a1a1a] translate-x-[-2px] translate-y-[-2px]" : "hover:bg-surface-container"
              }`}
            >
              SIGN UP
            </button>
          </div>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-6">
              <div>
                <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="email">
                  Electronic Mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="user@mlpilot.io"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
                />
              </div>
              <div>
                <label className="block font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-1" htmlFor="password">
                  Access Cipher
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b-2 border-primary p-3 font-body text-lg transition-all focus:ring-0 focus:border-b-4 focus:border-b-primary-container outline-none"
                />
              </div>
            </div>
            <div className="pt-4 space-y-4">
              <button
                type="submit"
                className="w-full bg-primary text-background border-2 border-primary py-4 px-6 font-headline font-black text-xl uppercase flex items-center justify-center gap-3 neo-shadow hover:bg-primary-container hover:text-primary transition-all active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
              >
                {tab === "signin" ? "Access Engine" : "Initialize Node"}
                <span className="material-symbols-outlined">{tab === "signin" ? "arrow_forward" : "person_add"}</span>
              </button>
              <div className="relative py-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-primary"></div>
                </div>
                <span className="relative px-4 bg-background font-headline font-bold text-xs text-primary uppercase">or continue with</span>
              </div>
              <button
                type="button"
                className="w-full bg-surface-container-high text-primary border-2 border-primary py-4 px-6 font-headline font-bold text-lg uppercase flex items-center justify-center gap-3 transition-all hover:bg-primary hover:text-background cursor-pointer"
              >
                <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-background text-xs font-bold">GH</span>
                GitHub Auth
              </button>
            </div>
          </form>

          <div className="mt-12 flex flex-col items-center gap-4">
            <a className="font-headline font-bold text-sm text-tertiary uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors" href="#">
              Forgotten access credentials?
            </a>
            <p className="text-xs text-on-surface-variant text-center leading-relaxed">
              By accessing MLPilot, you adhere to the <br />
              <span className="font-bold text-primary">Core Protocols</span> and <span className="font-bold text-primary">Privacy Directives</span>.
            </p>
            <NavLink to="/dashboard" className="font-headline font-bold text-sm uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors text-tertiary">
              Skip to Dashboard
            </NavLink>
          </div>
        </div>
      </section>
    </main>
  )
}
