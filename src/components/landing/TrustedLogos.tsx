'use client'

import React from 'react'

const logos = [
  { name: "Hikvision", src: "/brand-logos/hikvision.svg" },
  { name: "Axis Communications", src: "/brand-logos/axis-communications.svg" },
  { name: "Ubiquiti Networks", src: "/brand-logos/ubiquiti-networks.svg" },
  { name: "Cambium Networks", src: "/brand-logos/cambium-networks.svg" },
  { name: "MikroTik", src: "/brand-logos/mikrotik.svg" },
  { name: "Dahua Technology", src: "/brand-logos/dahua-technology.svg" },
  { name: "TP-Link", src: "/brand-logos/tp-link.svg" },
]

export default function TrustedLogos() {
  return (
    <section className="py-12 bg-[#F7FAFC] border-t border-[#E5EAF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        {/* Section Title */}
        <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
          Compatible with Common Infrastructure Ecosystems
        </h4>

        {/* Brand Row Container Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-y-6 gap-x-12">
          {logos.map((logo) => (
            <div 
              key={logo.name} 
              className="flex items-center justify-center select-none h-7 md:h-8 px-2 transition-all hover:scale-[1.03]" 
              title={`${logo.name} Compatibility`}
            >
              <img 
                src={logo.src} 
                alt={`${logo.name} logo`} 
                className="h-6 md:h-7 w-auto object-contain max-w-[150px] opacity-95"
              />
            </div>
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
