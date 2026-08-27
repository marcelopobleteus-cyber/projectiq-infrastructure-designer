'use client'

import React from 'react'
import Link from 'next/link'
import ProductMockup from './ProductMockup'

export default function HeroSection() {
  const handleScrollToDemo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const element = document.getElementById('dashboard-demo')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center py-12 md:py-16 bg-gradient-to-b from-white via-[#F4F8FA] to-[#F7FAFC] w-full">
      {/* Engineering Grid Background Pattern */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none select-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      {/* Decorative Blur Spheres (Soft cyan/green/purple glows) */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[#00C896]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[700px] h-[700px] bg-[#3B82F6]/8 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-1/10 left-1/2 w-[500px] h-[500px] bg-[#8B5CF6]/5 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Subtext, CTAs */}
          <div className="lg:col-span-5 flex flex-col items-start text-left space-y-6">
            
            {/* Small Badge */}
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0A1F44]/5 text-[#0A1F44] border border-[#0A1F44]/10 shadow-sm uppercase tracking-wider">
              ⚡ All-in-One Infrastructure Design Platform
            </span>

            {/* Main Title */}
            <h1 className="text-[#0A1F44] font-black text-4xl sm:text-5xl lg:text-5.5xl leading-[1.1] tracking-tight">
              Plan Fiber, CCTV & <br />
              <span className="bg-gradient-to-r from-[#00C896] via-[#3B82F6] to-[#8B5CF6] bg-[var(--bg)]lip-text text-transparent">
                Wireless Infrastructure
              </span> <br />
              in One Workspace
            </h1>

            {/* Hero Subtitle */}
            <p className="text-[#64748B] text-base sm:text-lg leading-relaxed max-w-lg">
              A visual platform to map cameras, design fiber routes, plan wireless links, assign field work, and track infrastructure progress.
            </p>

            {/* Quick Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
              {[
                { label: 'Map Editor', color: 'bg-[#00C896]/10 text-[#00C896]', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                { label: 'Fiber Splicer', color: 'bg-[#3B82F6]/10 text-[#3B82F6]', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { label: 'Wireless Links', color: 'bg-[#8B5CF6]/10 text-[#8B5CF6]', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M5.283 13.576a9.5 9.5 0 0113.434 0' },
                { label: 'CCTV Hub', color: 'bg-[#F59E0B]/10 text-[#F59E0B]', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
              ].map((pill) => (
                <div key={pill.label} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#E5EAF0] shadow-sm">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${pill.color} shrink-0`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={pill.icon} />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#0A1F44] tracking-tight">{pill.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-[#00C896] hover:bg-[#00B084] text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-[#00C896]/20 active:scale-[0.98]"
              >
                Launch Designer
              </Link>
              <button
                onClick={handleScrollToDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0A1F44] border border-[#E5EAF0] font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.98]"
              >
                View Demo
              </button>
            </div>

            {/* Small Trust Line */}
            <p className="text-[#64748B] text-xs font-semibold pt-2.5">
              🚀 A NextQ Technology infrastructure design platform. Built for engineers. Designed for field teams. Compatible with modern infrastructure environments.
            </p>

          </div>

          {/* Right Column: Visual Product Mockup */}
          <div id="dashboard-demo" className="lg:col-span-7 w-full flex flex-col justify-center">
            <ProductMockup />
          </div>

        </div>
      </div>
    </section>
  )
}
