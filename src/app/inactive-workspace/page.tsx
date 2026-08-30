import React from 'react'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'

export default function InactiveWorkspacePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 relative font-sans">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-8 shadow-xl relative z-10 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
            <path d="m9 16 2 2 4-4"/>
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Workspace Inactive
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-medium">
            This workspace is currently suspended or its commercial subscription is inactive.
            Please contact your organization administrator or NextQ support to reactivate access.
          </p>
        </div>

        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-left space-y-2">
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            Need assistance?
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            If you believe this is in error, reach out to our team at{' '}
            <a href="mailto:support@nextqtechs.com" className="text-[var(--accent-text)] font-semibold hover:underline">
              support@nextqtechs.com
            </a>
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <form action={logout}>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] font-bold rounded-xl transition text-xs cursor-pointer shadow-xs"
            >
              Sign Out / Switch Account
            </button>
          </form>
          <Link
            href="/login"
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition font-semibold"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
