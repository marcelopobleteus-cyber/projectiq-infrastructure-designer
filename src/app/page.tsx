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
      <footer className="bg-white border-t border-[#E5EAF0] py-8 text-center text-xs text-[#64748B] font-semibold">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} ProjectIQ. All rights reserved. Built for modern GIS and network grid design.</p>
        </div>
      </footer>
    </div>
  )
}
