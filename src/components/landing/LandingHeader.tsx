'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-[#E5EAF0] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0A1F44] text-[#00C896] font-extrabold text-sm tracking-wider shadow-sm transition-transform group-hover:scale-105">
                PQ
              </div>
              <span className="text-[#0A1F44] font-black text-xl tracking-tight">
                Project<span className="text-[#00C896]">IQ</span>
              </span>
            </Link>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Solutions', 'Workflow', 'Docs', 'Pricing'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-semibold text-[#64748B] hover:text-[#0A1F44] transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* Right: Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#64748B] hover:text-[#0A1F44] transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4.5 py-2 rounded-xl bg-[#0A1F44] hover:bg-[#153468] text-white text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              Launch Designer
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-[#64748B] hover:text-[#0A1F44] hover:bg-slate-100 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Overlay) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5EAF0] bg-white absolute top-16 left-0 w-full shadow-lg transition-all" id="mobile-menu">
          <div className="px-2 pt-2 pb-4 space-y-1.5 sm:px-3">
            {['Features', 'Solutions', 'Workflow', 'Docs', 'Pricing'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-[#64748B] hover:text-[#0A1F44] hover:bg-slate-50 transition-all"
              >
                {item}
              </Link>
            ))}
            <div className="border-t border-[#E5EAF0] my-2 pt-2 flex flex-col gap-2 px-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 rounded-lg text-base font-semibold text-[#64748B] hover:text-[#0A1F44] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 rounded-xl bg-[#0A1F44] text-white text-base font-bold transition-all shadow-sm"
              >
                Launch Designer
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
