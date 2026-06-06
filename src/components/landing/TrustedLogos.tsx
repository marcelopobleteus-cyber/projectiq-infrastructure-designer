'use client'

import React from 'react'

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
          
          {/* Hikvision */}
          <div className="flex items-center select-none" title="Hikvision Compatibility">
            <span className="font-extrabold text-[#D91C24] text-[15px] tracking-tight uppercase">
              HIK<span className="text-[#334155] font-semibold">VISION</span>
            </span>
          </div>

          {/* Axis Communications */}
          <div className="flex items-center gap-1 select-none" title="Axis Communications Compatibility">
            <span className="font-bold text-[#1E293B] text-[15px] tracking-wider uppercase">
              AXIS
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] ring-1 ring-[#FFB800]/20" />
            <span className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider ml-0.5">Communications</span>
          </div>

          {/* Ubiquiti Networks */}
          <div className="flex items-center select-none" title="Ubiquiti Networks Compatibility">
            <span className="font-extrabold text-[#0057E7] text-[15px] tracking-tight uppercase">
              UBIQUITI<span className="text-slate-400 font-normal text-[10px] ml-1 tracking-wider">NETWORKS</span>
            </span>
          </div>

          {/* Cambium Networks */}
          <div className="flex items-center select-none" title="Cambium Networks Compatibility">
            <span className="font-bold text-[#0F172A] text-[15px] tracking-tight">
              Cambium <span className="text-[#0284C7] font-semibold text-[13px]">Networks</span>
            </span>
          </div>

          {/* MikroTik */}
          <div className="flex items-center select-none" title="MikroTik Compatibility">
            <span className="font-extrabold text-[#1E293B] text-[15px] tracking-widest uppercase">
              mikro<span className="text-[#64748B] font-light">tik</span>
            </span>
          </div>

          {/* Dahua Technology */}
          <div className="flex items-center select-none" title="Dahua Technology Compatibility">
            <span className="font-black text-[#1E293B] text-[15px] tracking-tight lowercase">
              dahua <span className="text-[#D91C24] text-[9px] font-bold uppercase tracking-widest ml-0.5">technology</span>
            </span>
          </div>

          {/* TP-Link */}
          <div className="flex items-center select-none" title="TP-Link Compatibility">
            <span className="font-extrabold text-[#0D9488] text-[15px] tracking-tight lowercase">
              tp-link
            </span>
          </div>

        </div>

        {/* Small Disclaimer Line */}
        <p className="text-[10px] text-[#64748B]/60 font-medium">
          Brand names are shown for ecosystem context only. ProjectIQ is not affiliated with or endorsed by these companies.
        </p>

      </div>
    </section>
  )
}
