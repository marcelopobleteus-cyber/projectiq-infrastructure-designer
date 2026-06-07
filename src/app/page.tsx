import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LandingHeader from '@/components/landing/LandingHeader'
import HeroSection from '@/components/landing/HeroSection'
import TrustedLogos from '@/components/landing/TrustedLogos'
import FeatureStrip from '@/components/landing/FeatureStrip'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/design-review/projects')
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#0A1F44] flex flex-col antialiased selection:bg-[#00C896]/30 selection:text-[#0A1F44]">
      {/* 1. Navbar */}
      <LandingHeader />

      {/* 2. Main Content */}
      <main className="flex-1">
        {/* Hero Section (includes the Interactive Product Mockup) */}
        <HeroSection />

        {/* Compatibility Logos Bar */}
        <TrustedLogos />

        {/* Features Matrix Strip */}
        <FeatureStrip />
      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-[#E5EAF0] py-12 md:py-16 w-full text-sm text-[#64748B] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 pb-12 border-b border-[#E5EAF0]">
            {/* Column 1: Brand Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A1F44] text-[#00C896] font-extrabold text-xs tracking-wider shadow-sm">
                  PQ
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[#0A1F44] font-black text-lg tracking-tight">
                    Project<span className="text-[#00C896]">IQ</span>
                  </span>
                  <span className="text-[7.5px] text-[#64748B] font-black tracking-widest uppercase mt-0.5">
                    by NextQ Technology
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed max-w-sm font-medium">
                Next-generation spatial grid designer for fiber networks, CCTV surveillance routing, and point-to-multipoint wireless infrastructure.
              </p>
            </div>

            {/* Column 2: Platform Links */}
            <div className="space-y-3">
              <span className="block text-xs font-black text-[#0A1F44] uppercase tracking-widest">
                Platform
              </span>
              <ul className="space-y-2 text-xs font-semibold">
                <li><a href="#features" className="hover:text-[#00C896] transition-colors">Features</a></li>
                <li><a href="#solutions" className="hover:text-[#00C896] transition-colors">Solutions</a></li>
                <li><a href="#workflow" className="hover:text-[#00C896] transition-colors">Workflow</a></li>
                <li><a href="#pricing" className="hover:text-[#00C896] transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="space-y-3">
              <span className="block text-xs font-black text-[#0A1F44] uppercase tracking-widest">
                Resources
              </span>
              <ul className="space-y-2 text-xs font-semibold">
                <li><a href="#docs" className="hover:text-[#00C896] transition-colors">Documentation</a></li>
                <li><a href="#support" className="hover:text-[#00C896] transition-colors">Technical Support</a></li>
                <li><a href="#api" className="hover:text-[#00C896] transition-colors">API Reference</a></li>
                <li><a href="#privacy" className="hover:text-[#00C896] transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & System Alignment */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} NextQ Technology. ProjectIQ Infrastructure Designer. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
              <span className="text-[#64748B]/80 font-bold uppercase tracking-wider text-[9px]">
                Ecosystem Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
