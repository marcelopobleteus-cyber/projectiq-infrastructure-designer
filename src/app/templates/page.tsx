'use client'

import React, { useState } from 'react'

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  const templatesList = [
    {
      title: 'CCTV + Fiber Project',
      desc: 'Pre-configures a standard city or facility CCTV security layout integrated with fiber-optic backbones and FDUs.',
      workflow: 'Site Survey ➔ Camera Placement ➔ Fiber Splicing ➔ Connectivity Validation',
      assets: 'IP Cameras, Core Switches, Fiber Closures, FDUs, Backbone Cables',
      bom: 'Fiber strands, patch cords, camera mounts, NVR storage',
      naming: 'CAM-[001-999], SW-[001-999], FOS-[001-999]',
    },
    {
      title: 'Trail / City CCTV Project',
      desc: 'Optimized for long trails or city streets, pre-configuring outdoor enclosures, wireless backhaul nodes, and solar power brackets.',
      workflow: 'Terrain Review ➔ Solar Calculation ➔ Node Design ➔ Line of Sight Analysis',
      assets: 'Solar Enclosures, Wireless Radios, PTZ Cameras, PoE Injectors',
      bom: 'Batteries, solar panels, mounting brackets, drop cables',
      naming: 'PTZ-[001-999], RAD-[001-999], SOL-[001-999]',
    },
    {
      title: 'Parking Lot Camera Project',
      desc: 'Designed for retail or corporate parking lots, focusing on lighting poles, multi-sensor cameras, and copper switch distributions.',
      workflow: 'Pole Layout ➔ Multi-Sensor Angles ➔ Trenching Paths ➔ Switch Configuration',
      assets: 'Multi-Sensor Cameras, PoE Switches, NEMA Enclosures',
      bom: 'Conduit pipes, copper patch panels, mounting extensions',
      naming: 'MS-[001-999], POE-[001-999], CAB-[001-999]',
    },
    {
      title: 'ITS Camera Corridor',
      desc: 'Dedicated to Intelligent Transportation Systems. Focuses on highway corridors, cabinet stations, and high-speed fiber backbones.',
      workflow: 'Station Design ➔ Fiber Routing ➔ Splicing Plan ➔ Comm Check',
      assets: 'ITS Cabinets, Managed Switches, Media Converters, Dome Cameras',
      bom: 'ITS cabinets, concrete pads, SFP transceivers',
      naming: 'ITS-[001-999], SW-ITS-[001-999], FDU-ITS-[001-999]',
    },
    {
      title: 'Wireless Backhaul Project',
      desc: 'Configures point-to-point and point-to-multipoint microwave links, calculating frequencies, signal margins, and LOS bounds.',
      workflow: 'Elevation Survey ➔ Frequency Selection ➔ Dish Alignment ➔ Validation',
      assets: 'Base Stations, Subscriber Units, Parabolic Dishes, Switches',
      bom: 'Radio dishes, CAT6 shielded cables, surge suppressors',
      naming: 'AP-[001-999], SU-[001-999], LINK-[001-999]',
    },
    {
      title: 'Fiber Splicing Project',
      desc: 'Focused exclusively on splicing matrices, buffer tubes, strand assignments, and patch panel distributions.',
      workflow: 'Route Design ➔ Cable Selection ➔ Splice Matrix Design ➔ OTDR Test',
      assets: 'Splice Enclosures, FDUs, Backbone Cables, Ribbon Fibers',
      bom: 'Splice trays, heat shrink sleeves, ribbon modules',
      naming: 'SPL-[001-999], CAB-FO-[001-999]',
    },
    {
      title: 'Network Upgrade Project',
      desc: 'Focuses on core network upgrades, port allocations, PoE budget calculations, and rack mount cabinet designs.',
      workflow: 'Asset Inventory ➔ PoE Calculations ➔ Rack Layout ➔ VLAN Allocation',
      assets: 'Core Routers, Managed Switches, UPS units, Rack Cabinets',
      bom: 'CAT6 cables, rack screws, power strips, SFP+ transceivers',
      naming: 'RT-[001-999], SW-CORE-[001-999], UPS-[001-999]',
    }
  ]

  return (
    <div className="space-y-8 w-full px-6 py-8 font-sans text-slate-100 bg-[#0c0f1d] min-h-full overflow-y-auto scrollbar-thin relative">
      
      {/* Title Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2.5xl font-black text-white tracking-tight leading-none">
            Project Templates
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Pre-configure default parameters, workflows, and asset lists to launch designs faster.
          </p>
        </div>
        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
          Coming Soon
        </span>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templatesList.map((t, i) => (
          <div
            key={i}
            className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-800 transition"
          >
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base">{t.title}</h3>
                <span className="text-[8.5px] font-black text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">Planned</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
            </div>

            {/* Details container */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-[10.5px] font-mono space-y-2 text-slate-450">
              <div>
                <strong className="text-slate-350">Default Workflow:</strong>
                <p className="text-indigo-400/90 mt-0.5 leading-snug">{t.workflow}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5 border-t border-slate-900/60">
                <div>
                  <strong className="text-slate-350">Asset Types:</strong>
                  <p className="text-slate-450 mt-0.5 leading-snug">{t.assets}</p>
                </div>
                <div>
                  <strong className="text-slate-350">Naming Standard:</strong>
                  <p className="text-slate-400 mt-0.5 font-bold">{t.naming}</p>
                </div>
              </div>
            </div>

            {/* Actions button */}
            <button
              type="button"
              onClick={() => setSelectedTemplate(t)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-400 text-slate-300 rounded-xl text-xs font-bold transition tracking-wide cursor-pointer active:scale-98"
            >
              Configure Template Options — Preview
            </button>
          </div>
        ))}
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedTemplate(null)} />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest font-mono">Template Specifications</span>
              <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider mt-0.5">{selectedTemplate.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2">{selectedTemplate.desc}</p>
            </div>

            <div className="space-y-3.5 text-xs font-mono bg-slate-950/40 p-4 border border-slate-900 rounded-xl text-slate-450">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-550 uppercase">Planned Workflow Steps</span>
                <p className="text-indigo-400 leading-relaxed">{selectedTemplate.workflow}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-550 uppercase">Default Asset Inventory</span>
                  <p className="text-slate-350">{selectedTemplate.assets}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-550 uppercase">Part Number Format</span>
                  <p className="text-slate-350 font-bold">{selectedTemplate.naming}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-900">
                <span className="text-[9px] font-bold text-slate-550 uppercase">Default Bill of Materials List</span>
                <p className="text-slate-350 leading-relaxed">{selectedTemplate.bom}</p>
              </div>

              <div className="pt-2 border-t border-slate-900 text-rose-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Status: Coming Soon (Under Development)
              </div>
            </div>

            {/* Inactive future actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button disabled className="py-2 bg-slate-950 border border-slate-900 text-slate-650 rounded-xl text-[10px] font-bold transition tracking-wider uppercase cursor-not-allowed">
                Create Project
              </button>
              <button disabled className="py-2 bg-slate-950 border border-slate-900 text-slate-650 rounded-xl text-[10px] font-bold transition tracking-wider uppercase cursor-not-allowed">
                Duplicate
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedTemplate(null)} className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-350 rounded-xl text-xs font-bold transition">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
