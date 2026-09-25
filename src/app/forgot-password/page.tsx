'use client'

import React, { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { forgotPassword } from '../auth/actions'

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  // Un enlace de recuperacion vencido o ya usado vuelve aqui con el motivo; sin
  // esto el usuario solo veia el formulario otra vez, sin saber que paso.
  const linkError = searchParams.get('error')
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    const email = (formData.get('email') as string)?.trim()

    startTransition(async () => {
      const res = await forgotPassword(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setSubmittedEmail(email)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 relative font-sans">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-8 shadow-sm relative z-10">
        <div className="text-center mb-8">
          <img
            src="/brand/nextq-logo-horizontal.svg"
            alt="NextQ Technology"
            width={188}
            height={63}
            className="mx-auto mb-5 h-auto w-[188px]"
          />
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Forgot password?</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            Enter your email address and we'll send you a password reset link.
          </p>
        </div>

        {(error || linkError) && (
          <div className="bg-red-50 border border-red-200 text-[var(--danger)] text-xs font-semibold p-3 rounded-lg mb-6">
            {error || `That reset link did not work: ${linkError}. Request a new one below — open it in this same browser, and note it expires after a while.`}
          </div>
        )}

        {submittedEmail ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium p-4 rounded-lg leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Email sent successfully
              </div>
              If an account exists for <span className="font-bold text-emerald-950">{submittedEmail}</span>, you will receive an email with instructions to set your password.
            </div>

            <Link
              href="/login"
              className="w-full block text-center py-2.5 px-4 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold rounded-lg transition-all text-xs border border-[var(--border)]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
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
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-all text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-[var(--accent)] text-white font-bold rounded-lg transition-all shadow-xs text-xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs font-bold text-[var(--accent-text)] hover:underline">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
