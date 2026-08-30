'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { login } from '../auth/actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const res = await login(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 relative font-sans">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-8 shadow-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent)] text-white mb-4 font-black text-xl tracking-wider shadow-xs">
            NQ
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Welcome Back</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">Sign in to your NextQ workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-[var(--danger)] text-xs font-semibold p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue="marcelopoblete.us+test654@gmail.com"
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                defaultValue="Password123!"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-lg transition-all shadow-xs text-xs cursor-pointer"
          >
            {isPending ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link href="/register" className="text-[var(--accent-text)] hover:underline font-bold">
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
