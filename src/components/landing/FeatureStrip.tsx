'use client'

import React from 'react'

const features = [
  {
    title: 'Interactive Map',
    description: 'Visualize your entire infrastructure in real time with powerful GIS map overlays and node placement tools.',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    color: 'text-[#00C896] bg-[#00C896]/10 border-[#00C896]/20',
  },
  {
    title: 'Fiber Design',
    description: 'Design OSP backbone and drop routes, map cable pass-throughs, and manage individual buffer tubes and core strands with ease.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20',
  },
  {
    title: 'Wireless Connectivity',
    description: 'Plan point-to-point (PTP) and point-to-multipoint (PTMP) wireless networks, align antennas, and monitor path link loss budgets.',
    icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M5.283 13.576a9.5 9.5 0 0113.434 0',
    color: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20',
  },
  {
    title: 'CCTV Management',
    description: 'Manage camera coordinates, IP schemas, switch port budgets, and optical terminations in a unified project cabinet hierarchy.',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
  },
  {
    title: 'Field Operations',
    description: 'Bypass manual matrices with a visual technician guide. Generate planned splices, assign tasks, and track completed work in the field.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20',
  },
  {
    title: 'Real-time Insights',
    description: 'Monitor active project metrics, optical budget losses, materials (BOM) inventories, and path testing statuses in one dashboard.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20',
  },
]

export default function FeatureStrip() {
  return (
    <section id="features" className="py-20 bg-white border-t border-[#E5EAF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold text-[#00C896] uppercase tracking-widest">
            Platform Capabilities
          </span>
          <h2 className="text-[#0A1F44] text-3xl sm:text-4xl font-black tracking-tight">
            Designed for Modern Spatial Planning & Engineering
          </h2>
          <p className="text-[#64748B] text-base leading-relaxed">
            Eliminate loose spreadsheets and outdated CAD files. Plan, Terminate, and Deploy your physical networking layers inside a single visual tool.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#E5EAF0] p-6 hover:border-[#0A1F44]/10 hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col items-start gap-4 group"
            >
              {/* Feature Icon */}
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${feature.color} transition-transform group-hover:scale-105 shrink-0`}>
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>

              {/* Text Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#0A1F44] tracking-tight transition-colors group-hover:text-[#00C896]">
                  {feature.title}
                </h3>
                <p className="text-[#64748B] text-xs sm:text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
