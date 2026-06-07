'use client'

import React, { useState } from 'react'

// Define the brand logo assets array with primary SVG and fallback PNG paths
// as requested by the ProjectIQ landing page brand ecosystem specifications.
const logos = [
  {
    name: "Hikvision",
    src: "/brand-logos/hikvision.svg",
    fallbackSrc: "/brand-logos/hikvision.png",
  },
  {
    name: "Axis Communications",
    src: "/brand-logos/axis-communications.svg",
    fallbackSrc: "/brand-logos/axis-communications.png",
  },
  {
    name: "Ubiquiti Networks",
    src: "/brand-logos/ubiquiti-networks.svg",
    fallbackSrc: "/brand-logos/ubiquiti-networks.png",
  },
  {
    name: "Cambium Networks",
    src: "/brand-logos/cambium-networks.svg",
    fallbackSrc: "/brand-logos/cambium-networks.png",
  },
  {
    name: "MikroTik",
    src: "/brand-logos/mikrotik.svg",
    fallbackSrc: "/brand-logos/mikrotik.png",
  },
  {
    name: "Dahua Technology",
    src: "/brand-logos/dahua-technology.svg",
    fallbackSrc: "/brand-logos/dahua-technology.png",
  },
  {
    name: "TP-Link",
    src: "/brand-logos/tp-link.svg",
    fallbackSrc: "/brand-logos/tp-link.png",
  },
]

/**
 * Developer Note:
 * If the real image or SVG files are missing from the public/brand-logos/ folder,
 * this component automatically falls back to rendering a neutral gray placeholder
 * card saying "Logo asset missing" via the onError handler. We do not invent
 * or approximate logos with styled CSS text or typography.
 */
function LogoItem({ logo }: { logo: typeof logos[0] }) {
  const [imgError, setImgError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)

  const handleError = () => {
    // If SVG fails, try PNG fallback. If both fail, render the neutral placeholder card.
    if (!triedFallback && logo.fallbackSrc) {
      setTriedFallback(true)
    } else {
      setImgError(true)
    }
  }

  if (imgError) {
    return (
      <div 
        className="flex items-center justify-center bg-slate-50 border border-dashed border-[#E5EAF0] rounded-xl px-4.5 py-2 text-[10px] text-slate-400 font-bold tracking-wide select-none h-6 md:h-8"
        title={`${logo.name} logo asset is missing`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2 shrink-0" />
        {logo.name} Asset Missing
      </div>
    )
  }

  return (
    <img
      src={triedFallback ? logo.fallbackSrc : logo.src}
      alt={`${logo.name} logo`}
      onError={handleError}
      className="h-6 md:h-8 w-auto object-contain transition-all hover:scale-[1.02] opacity-95 hover:opacity-100"
    />
  )
}

export default function TrustedLogos() {
  return (
    <section className="py-12 bg-[#F7FAFC] border-t border-[#E5EAF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        {/* Section Title */}
        <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
          Compatible with Common Infrastructure Ecosystems
        </h4>

        {/* Brand Row Container Card */}
        <div className="bg-white border border-[#E5EAF0] rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-y-6 gap-x-12">
          {logos.map((logo) => (
            <LogoItem key={logo.name} logo={logo} />
          ))}
        </div>

        {/* Small Disclaimer Line */}
        <p className="text-[10px] text-[#64748B]/60 font-medium">
          Brand names and logos are shown for ecosystem context only. ProjectIQ is not affiliated with or endorsed by these companies.
        </p>

      </div>
    </section>
  )
}
