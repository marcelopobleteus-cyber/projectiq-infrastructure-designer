'use client'

import React from 'react'

export default function ProductMockup() {
  return (
    <div className="w-full bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl overflow-hidden flex flex-col h-[520px] font-sans">
      {/* 1. Top Bar */}
      <div className="h-14 bg-white border-b border-[#E5EAF0] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Mock Window Controls */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/40" />
            <span className="w-3 h-3 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/40" />
            <span className="w-3 h-3 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40" />
          </div>
          <span className="text-xs font-semibold text-[#64748B] border-l border-slate-200 pl-3">
            ProjectIQ Dashboard
          </span>
        </div>

        {/* Project Selector & Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7FAFC] border border-[#E5EAF0] rounded-xl text-xs font-medium text-[#0A1F44]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
            City Surveillance Project
          </div>
          <div className="relative hidden sm:block">
            <input
              type="text"
              readOnly
              placeholder="Search on map..."
              className="px-3 py-1.5 bg-[#F7FAFC] border border-[#E5EAF0] rounded-xl text-[11px] text-[#64748B] focus:outline-none w-36 pl-7"
            />
            <svg
              className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#64748B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main App Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* 2. Left Sidebar */}
        <aside className="w-48 bg-[#F7FAFC] border-r border-[#E5EAF0] p-3 hidden md:flex flex-col gap-1 select-none">
          {[
            { label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { label: 'Projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z' },
            { label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', active: true },
            { label: 'Cameras', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
            { label: 'Fiber Routes', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { label: 'Wireless Links', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M5.283 13.576a9.5 9.5 0 0113.434 0' },
            { label: 'Splices', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m12 10a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
            { label: 'Field Work', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            { label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                item.active
                  ? 'bg-white text-[#0A1F44] border border-[#E5EAF0] shadow-sm font-bold'
                  : 'text-[#64748B] hover:text-[#0A1F44] hover:bg-[#E5EAF0]/20'
              }`}
            >
              <svg
                className={`w-4.5 h-4.5 ${item.active ? 'text-[#00C896]' : 'text-[#64748B]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </div>
          ))}
        </aside>

        {/* 3. Map Viewport Canvas */}
        <div className="flex-1 relative bg-[#F7F9FB] overflow-hidden flex">
          {/* Visual SVG Map Backdrop (Streets & Water Mock) */}
          <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {/* Water Body */}
            <path d="M-50,300 C150,250 200,380 400,320 C600,260 700,420 900,360 L900,600 L-50,600 Z" fill="#E6EEF8" />
            
            {/* Green park zones */}
            <rect x="80" y="50" width="160" height="100" rx="15" fill="#E2F5EE" />
            <circle cx="680" cy="120" r="70" fill="#E2F5EE" />
            
            {/* Grid street mockups */}
            <g stroke="#E5EAF0" strokeWidth="2.5">
              <line x1="-50" y1="90" x2="800" y2="90" />
              <line x1="-50" y1="210" x2="800" y2="210" />
              <line x1="-50" y1="360" x2="800" y2="360" />
              <line x1="100" y1="-50" x2="100" y2="500" />
              <line x1="320" y1="-50" x2="320" y2="500" />
              <line x1="550" y1="-50" x2="550" y2="500" />
            </g>

            {/* Connection Lines */}
            {/* 1. Fiber Route: Solid Green Line */}
            <line x1="100" y1="90" x2="320" y2="90" stroke="#00C896" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="320" y1="90" x2="320" y2="210" stroke="#00C896" strokeWidth="4.5" strokeLinecap="round" />
            
            {/* 2. Wireless PTP: Dashed Blue Line */}
            <line x1="100" y1="90" x2="100" y2="210" stroke="#3B82F6" strokeWidth="3.5" strokeDasharray="6 4" strokeLinecap="round" />
            
            {/* 3. Wireless PTMP: Dashed Purple Line */}
            <path d="M 320,90 Q 420,150 550,210" stroke="#8B5CF6" strokeWidth="3" strokeDasharray="6 4" fill="none" />
            
            {/* 4. LTE/5G Backup: Dotted Orange Line */}
            <line x1="320" y1="210" x2="550" y2="90" stroke="#F59E0B" strokeWidth="3" strokeDasharray="2 3" strokeLinecap="round" />

            {/* 5. Problem Link: Solid Red Line */}
            <line x1="100" y1="210" x2="320" y2="210" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          </svg>

          {/* Interactive GIS Markers */}
          {/* Cam 01A - Online (Fiber Source Node to Left, connected by green) */}
          <div className="absolute top-[68px] left-[78px]" title="Cam 01A">
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5EAF0] shadow-md flex items-center justify-center text-[#FACC15] relative">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {/* Status Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
              </div>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0A1F44] text-white text-[8px] font-black tracking-tight shadow-sm font-mono uppercase">
                Cam 01A
              </span>
            </div>
          </div>

          {/* Cam 02B - Online (North Pole, Wireless PTP) */}
          <div className="absolute top-[188px] left-[78px]" title="Cam 02B">
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5EAF0] shadow-md flex items-center justify-center text-[#FACC15] relative">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
              </div>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0A1F44] text-white text-[8px] font-black tracking-tight shadow-sm font-mono uppercase">
                Cam 02B
              </span>
            </div>

            {/* Wireless Tooltip Card */}
            <div className="absolute -top-28 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-[#E5EAF0] p-2.5 rounded-xl shadow-xl w-36 text-[10px] z-25 text-[#0A1F44] font-medium space-y-1">
              <div className="font-bold border-b border-slate-100 pb-1 flex justify-between items-center text-slate-800">
                <span>Cam 02B - North</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              </div>
              <div>IP: 192.168.12.203</div>
              <div>Link: Wireless PTP</div>
              <div className="text-[#8B5CF6] font-bold">Signal: -65 dBm</div>
              <div>Latency: 11 ms</div>
            </div>
          </div>

          {/* Cam 03C - Weak Signal (Center right, connected by orange dotted and purple dashed) */}
          <div className="absolute top-[68px] left-[298px]" title="Cam 03C">
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5EAF0] shadow-md flex items-center justify-center text-[#FACC15] relative">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#FACC15] border-2 border-white" />
              </div>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0A1F44] text-white text-[8px] font-black tracking-tight shadow-sm font-mono uppercase">
                Cam 03C
              </span>
            </div>
          </div>

          {/* Cam 04D - Offline (Bottom right, connected by problem red link) */}
          <div className="absolute top-[188px] left-[298px]" title="Cam 04D">
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5EAF0] shadow-md flex items-center justify-center text-[#FACC15] relative">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-white animate-pulse" />
              </div>
              <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0A1F44] text-white text-[8px] font-black tracking-tight shadow-sm font-mono uppercase">
                Cam 04D
              </span>
            </div>
          </div>

          {/* 4. Connectivity Legend Card */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-[#E5EAF0] shadow-lg text-[10px] w-40 select-none space-y-1.5 z-20">
            <span className="block font-bold text-[#0A1F44] uppercase text-[9px] tracking-wider border-b border-[#E5EAF0] pb-1">
              Connectivity Legend
            </span>
            <div className="space-y-1 text-[#64748B] font-medium">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.75 bg-[#00C896] block" />
                <span>Fiber Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.75 border-b border-[#3B82F6] border-dashed block" />
                <span>Wireless PTP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.75 border-b border-[#8B5CF6] border-dashed block" />
                <span>Wireless PTMP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-b border-[#F59E0B] border-dotted block" />
                <span>LTE/5G Backup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.75 bg-[#EF4444] block" />
                <span>Problem Link</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Right Sidebar: Details Card */}
        <aside className="w-64 bg-white border-l border-[#E5EAF0] p-4 flex flex-col gap-4 select-none shrink-0 z-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-2">
              <span className="font-extrabold text-[#0A1F44] text-xs uppercase tracking-wider">
                Camera Details
              </span>
              <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Online
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#64748B] font-medium">
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Camera Name</span>
                <span className="text-[#0A1F44] font-bold text-sm">Cam 01A - West Gate</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">IP Address</span>
                <span className="font-mono text-[#0A1F44] font-semibold">192.168.12.115</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Connectivity</span>
                <span className="text-[#0A1F44] font-bold inline-flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded bg-[#00C896]" />
                  Fiber Optic
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Fiber Strand</span>
                <span className="text-[#0A1F44] font-semibold">Tube 03 / Fiber 12</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Latency</span>
                  <span className="text-[#0A1F44] font-bold">11 ms</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Tx/Rx Power</span>
                  <span className="text-[#0A1F44] font-bold">-4.5 dBm</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 bg-[#F7FAFC] hover:bg-[#E5EAF0]/40 text-[#0A1F44] border border-[#E5EAF0] rounded-xl text-xs font-bold transition-all text-center"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar Chart */}
          <div className="bg-[#F7FAFC] border border-[#E5EAF0] p-3 rounded-2xl space-y-2">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
              Optical Budget Loss
            </span>
            <div className="flex items-end gap-2 h-14 pt-2">
              <div className="flex-1 bg-[#00C896]/15 hover:bg-[#00C896]/20 transition-all rounded-t-md h-full relative" title="MH-001 (0.02 dB)">
                <span className="absolute bottom-1.5 inset-x-0 text-[8px] text-[#00C896] text-center font-bold">MH</span>
              </div>
              <div className="flex-1 bg-[#00C896]/10 hover:bg-[#00C896]/20 transition-all rounded-t-md h-3/4 relative" title="MH-002 (0.04 dB)">
                <span className="absolute bottom-1.5 inset-x-0 text-[8px] text-[#00C896] text-center font-bold">MH</span>
              </div>
              <div className="flex-1 bg-[#00C896]/30 hover:bg-[#00C896]/40 transition-all rounded-t-md h-1/2 relative" title="CAB-001 (0.06 dB)">
                <span className="absolute bottom-1.5 inset-x-0 text-[8px] text-[#00C896] text-center font-bold">CAB</span>
              </div>
              <div className="flex-1 bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 transition-all rounded-t-md h-5/6 relative" title="Total Loss (0.12 dB)">
                <span className="absolute bottom-1.5 inset-x-0 text-[8px] text-[#3B82F6] text-center font-bold">TOT</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
