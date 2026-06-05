'use client'

import React from 'react'

export default function TrustedLogos() {
  const brands = [
    'Ubiquiti Networks',
    'Axis Communications',
    'Hikvision',
    'Cambium Networks',
    'MikroTik',
    'Dahua Technology',
    'TP-Link',
  ]

  return (
    <section className="py-12 bg-[#F7FAFC] border-t border-b border-[#E5EAF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block">
          Compatible with Common Infrastructure Ecosystems
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-[#64748B] hover:text-[#0A1F44] font-black text-sm tracking-tight opacity-40 hover:opacity-80 transition-all font-mono select-none"
            >
              {brand.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
