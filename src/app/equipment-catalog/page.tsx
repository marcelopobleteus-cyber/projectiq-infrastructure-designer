'use client'

import React, { useState, useRef } from 'react'

export default function EquipmentCatalogPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<'category' | 'brand' | 'type' | 'none'>('category')
  
  // Specific filters
  const [filterBrand, setFilterBrand] = useState('All')
  const [filterConnectivity, setFilterConnectivity] = useState('All')
  const [filterPower, setFilterPower] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  // Selected item for drawer
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  
  // Image Upload state mapping: part number -> base64 data URL
  const [equipmentImages, setEquipmentImages] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [isImportRulesOpen, setIsImportRulesOpen] = useState(false)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const categories = [
    'All',
    'Cameras',
    'Switches',
    'Routers & Firewalls',
    'Wireless Radios',
    'Fiber Cables',
    'Fiber Closures',
    'FDUs & Patch Panels',
    'Cabinets',
    'UPS & Power',
    'SFPs',
    'Mounting Hardware'
  ]

  // Complete seed database with all required technical columns
  const seedCatalog = [
    // Cameras
    { category: 'Cameras', brand: 'Axis', model: 'P3245-LVE', part: '01593-001', type: 'Dome', connectivity: 'RJ45 / Copper', power: 'PoE', poeDraw: '7.5W', ports: '—', fiberCount: '—', status: 'Active', spec: 'Varifocal 1080p dome, Lightfinder 2.0, Forensic WDR.', resolution: '1080p', lens: '3.4-8.9 mm', fov: '100°–36°', range: '30m', nightVision: 'OptimizedIR', mount: 'Wall/Ceiling/Pole', environment: 'Outdoor (IP66)' },
    { category: 'Cameras', brand: 'Axis', model: 'Q6135-LE', part: '01925-001', type: 'PTZ', connectivity: 'RJ45 / Copper', power: 'PoE+', poeDraw: '25W', ports: '—', fiberCount: '—', status: 'Active', spec: 'High-speed PTZ camera, 31x zoom, built-in IR laser, auto-tracking.', resolution: '1080p', lens: '4.3-133.3 mm', fov: '60.6°–2.0°', range: '250m', nightVision: 'Laser IR 250m', mount: 'Wall/Pole', environment: 'Outdoor (IP66)' },
    { category: 'Cameras', brand: 'Hanwha', model: 'PNM-9085RQZ', part: 'PNM-9085RQZ', type: 'Multi-sensor', connectivity: 'RJ45 / Copper', power: 'PoE+', poeDraw: '32W', ports: '—', fiberCount: '—', status: 'Active', spec: 'Multi-directional camera, 4 x 5MP sensors, motorized varifocal.', resolution: '4x 5MP', lens: '3.6-9.4 mm', fov: '4x 102°–44°', range: '40m', nightVision: 'No', mount: 'Ceiling/Pole', environment: 'Outdoor (IP66)' },

    // Switches
    { category: 'Switches', brand: 'Cisco', model: 'IE 3200-8P2S-E', part: 'IE-3200-8P2S-E', type: 'Industrial PoE', connectivity: 'RJ45 & SFP', power: 'DC / PoE', poeDraw: '240W budget', ports: '8 RJ45 + 2 SFP', fiberCount: '—', status: 'Active', spec: 'Industrial managed switch, hardened chassis, modular expansions.', switchType: 'Industrial / PoE', rj45Ports: 8, sfpPorts: 2, poePorts: 8, poeBudget: '240W', speed: '1 Gbps', managed: 'Managed', rating: 'IP30', powerInput: '24-48VDC' },
    { category: 'Switches', brand: 'Ubiquiti', model: 'Pro Max 48 PoE', part: 'USW-Pro-Max-48-PoE', type: 'PoE Switch', connectivity: 'RJ45 & SFP+', power: 'AC', poeDraw: '720W budget', ports: '48 RJ45 + 4 SFP+', fiberCount: '—', status: 'Active', spec: 'Managed Layer 3 switch with 16x PoE+ ports and 8x PoE++ ports.', switchType: 'Access / PoE', rj45Ports: 48, sfpPorts: 4, poePorts: 48, poeBudget: '720W', speed: '10 Gbps Uplinks', managed: 'Managed', rating: 'Commercial', powerInput: '100-240VAC' },
    { category: 'Switches', brand: 'Generic', model: 'Industrial PoE+ 4P', part: 'GEN-IND-4P-PoE', type: 'Hardened Switch', connectivity: 'RJ45 & SFP', power: 'DC', poeDraw: '120W budget', ports: '4 RJ45 + 1 SFP', fiberCount: '—', status: 'Active', spec: 'Industrial unmanaged switch, hardened design.', switchType: 'Hardened / Unmanaged', rj45Ports: 4, sfpPorts: 1, poePorts: 4, poeBudget: '120W', speed: '1 Gbps', managed: 'Unmanaged', rating: 'IP40', powerInput: '12-54VDC' },

    // Routers
    { category: 'Routers & Firewalls', brand: 'Fortinet', model: 'FortiGate 60F', part: 'FG-60F', type: 'Firewall', connectivity: 'RJ45 / Copper', power: 'DC', poeDraw: '—', ports: '10 RJ45', fiberCount: '—', status: 'Active', spec: 'Next-Generation Firewall, 1.4 Gbps threat protection throughput.', throughput: '1.4 Gbps', portsCount: 10, formFactor: 'Desktop' },
    { category: 'Routers & Firewalls', brand: 'Ubiquiti', model: 'EdgeRouter 12', part: 'ER-12', type: 'Core Router', connectivity: 'RJ45 & SFP', power: 'DC', poeDraw: '—', ports: '10 RJ45 + 2 SFP', fiberCount: '—', status: 'Active', spec: 'Gigabit router, layer 3 routing, 3.4 Gbps routing capacity.', throughput: '3.4 Gbps', portsCount: 12, formFactor: 'Rackmount' },

    // Wireless
    { category: 'Wireless Radios', brand: 'Ubiquiti', model: 'airFiber 60 LR', part: 'AF60-LR', type: 'PtP Radio', connectivity: 'Wireless', power: 'PoE', poeDraw: '18W', ports: '1 RJ45', fiberCount: '—', status: 'Active', spec: '60 GHz Point-to-Point link, low latency, 1.5 Gbps+ throughput, 15 km range.', frequency: '60 GHz', throughput: '1.8 Gbps', gain: '38 dBi', range: '15 km' },
    { category: 'Wireless Radios', brand: 'Cambium', model: 'PTP 450i', part: 'C050045B001A', type: 'Carrier PtP', connectivity: 'Wireless', power: 'PoE', poeDraw: '30W', ports: '2 RJ45', fiberCount: '—', status: 'Active', spec: 'Ultra-hardened Carrier-grade microwave PtP link.', frequency: '4.9 - 5.9 GHz', throughput: '300 Mbps', gain: '23 dBi', range: '40 km' },

    // Fiber Cables
    { category: 'Fiber Cables', brand: 'Corning', model: 'ALTOS Armored 12S', part: '012EU4-T4101D20', type: 'Loose Tube', connectivity: 'Fibers', power: '—', poeDraw: '—', ports: '—', fiberCount: '12', status: 'Active', spec: 'Single-mode armored fiber cable, outdoor dry water-blocking, G.652.D.', mode: 'Singlemode', cableType: 'Loose Tube Armored', armored: 'Yes', outdoorIndoor: 'Outdoor' },
    { category: 'Fiber Cables', brand: 'OFS', model: 'Fortex DT 48S', part: 'AT-3BE88DY-048', type: 'Ribbon Cable', connectivity: 'Fibers', power: '—', poeDraw: '—', ports: '—', fiberCount: '48', status: 'Active', spec: '48-strand single-mode armored fiber cable, PE sheath, loose tube.', mode: 'Singlemode', cableType: 'Ribbon Dielectric', armored: 'No (Dielectric)', outdoorIndoor: 'Outdoor' },

    // Closures
    { category: 'Fiber Closures', brand: 'CommScope', model: 'FOSC 450 B6', part: 'FOSC450-B6-6-12-1', type: 'Splice Dome', connectivity: 'Splicing Tray', power: '—', poeDraw: '—', ports: '—', fiberCount: '144', status: 'Active', spec: 'Gel-sealed fiber splice closure, butt/inline splicing, holds up to 144 splices.' },
    { category: 'Fiber Closures', brand: 'Preformed Line', model: 'COYOTE LCC', part: '8006951', type: 'Low-count Closure', connectivity: 'Splicing Tray', power: '—', poeDraw: '—', ports: '—', fiberCount: '24', status: 'Active', spec: 'Low-count fiber splice closure, holds up to 24 single splices.' },

    // FDUs
    { category: 'FDUs & Patch Panels', brand: 'Panduit', model: 'Opticom 1RU', part: 'FRME1U', type: 'Rack Panel', connectivity: 'LC/SC Adaptor', power: '—', poeDraw: '—', ports: '3 FAP slots', fiberCount: '72', status: 'Active', spec: '1RU rack mount fiber enclosure, holds 3 Opticom LC/SC adapter plates.' },
    { category: 'FDUs & Patch Panels', brand: 'CommScope', model: 'FDU Slide-Out 2RU', part: 'FDU-2RU-SL', type: 'Slide-Out FDU', connectivity: 'LC/UPC Adaptor', power: '—', poeDraw: '—', ports: '48 LC Ports', fiberCount: '48', status: 'Active', spec: '2RU slide-out fiber distribution panel pre-loaded with LC/UPC adapters.' },

    // Cabinets
    { category: 'Cabinets', brand: 'Hoffman', model: 'NEMA 4X Stainless', part: 'A20H1610SSLP', type: 'NEMA Box', connectivity: '—', power: '—', poeDraw: '—', ports: '—', fiberCount: '—', status: 'Active', spec: '20"x16"x10" wall-mount NEMA 4X steel cabinet with secure latching.' },
    { category: 'Cabinets', brand: 'Generic', model: 'Traffic Cabinet 332', part: 'CAB-332-ITS', type: 'ITS Cabinet', connectivity: 'Copper/Power Terminal', power: '120VAC', poeDraw: '—', ports: '—', fiberCount: '—', status: 'Active', spec: 'ITS highway traffic cabinet, 19" rack rails, integrated ventilation fan.' },

    // UPS
    { category: 'UPS & Power', brand: 'APC', model: 'Smart-UPS 1500', part: 'SMT1500C', type: 'Smart UPS', connectivity: 'NEMA 5-15R', power: 'AC', poeDraw: '—', ports: '8 Outlets', fiberCount: '—', status: 'Active', spec: 'Line-interactive UPS, 2U rack mount, LCD display, cloud monitoring.' },
    { category: 'UPS & Power', brand: 'Altronix', model: 'NetWay1D PoE', part: 'NetWay1D', type: 'PoE Injector', connectivity: 'RJ45 PoE', power: 'AC', poeDraw: '60W PoE++', ports: '1 In + 1 Out', fiberCount: '—', status: 'Active', spec: 'Hardened single-port PoE++ midspan injector, 60W power output.' },

    // SFPs
    { category: 'SFPs', brand: 'FS.com', model: '10G SFP+ SM 10km', part: 'SFP-10GLR-31', type: 'SFP Transceiver', connectivity: 'LC Duplex', power: '3.3V SFP', poeDraw: '—', ports: 'LC Duplex', fiberCount: '2', status: 'Active', spec: '10G single-mode transceiver, 1310nm wavelength, 10km link distance.' },
    { category: 'SFPs', brand: 'FS.com', model: '1G SFP Copper RJ45', part: 'SFP-GB-GE-T', connectivity: 'RJ45', type: 'Copper Transceiver', power: '3.3V SFP', poeDraw: '—', ports: 'RJ45', fiberCount: '—', status: 'Active', spec: '1000Base-T copper SFP module, up to 100m over CAT5e/6.' },

    // Mounting Hardware
    { category: 'Mounting Hardware', brand: 'Axis', model: 'T91B67 Pole Mount', part: '5507-671', type: 'Pole Bracket', connectivity: '—', power: '—', poeDraw: '—', ports: '—', fiberCount: '—', status: 'Active', spec: 'Stainless steel pole mount bracket for Axis dome and PTZ mounts.' },
    { category: 'Mounting Hardware', brand: 'Generic', model: 'Banding Straps Kit', part: 'BAND-IT-S34', type: 'Metal Banding', connectivity: '—', power: '—', poeDraw: '—', ports: '—', fiberCount: '—', status: 'Active', spec: 'Heavy-duty steel strapping kit to bind NEMA cabinets to light poles.' }
  ]

  // Filter logic
  const filteredItems = seedCatalog.filter((item) => {
    // Category tab filter
    if (activeCategory !== 'All' && item.category !== activeCategory) {
      return false
    }

    // Search query filter
    const query = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      item.model.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      (item.part && item.part.toLowerCase().includes(query)) ||
      (item.spec && item.spec.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)

    if (!matchesSearch) return false

    // Brand filter
    if (filterBrand !== 'All' && item.brand !== filterBrand) return false

    // Connectivity filter
    if (filterConnectivity !== 'All' && !item.connectivity.toLowerCase().includes(filterConnectivity.toLowerCase())) return false

    // Power filter
    if (filterPower !== 'All' && !item.power.toLowerCase().includes(filterPower.toLowerCase())) return false

    // Status filter
    if (filterStatus !== 'All' && item.status !== filterStatus) return false

    return true
  })

  // Grouping logic
  const getGroupedItems = () => {
    if (groupBy === 'none') {
      return { 'All Items': filteredItems }
    }
    const grouped: Record<string, any[]> = {}
    filteredItems.forEach((item) => {
      let key = ''
      if (groupBy === 'category') key = item.category
      else if (groupBy === 'brand') key = item.brand
      else if (groupBy === 'type') key = item.type
      
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })
    return grouped
  }

  const groupedCatalog = getGroupedItems()

  // Extract unique brands for filters based on activeCategory
  const uniqueBrands = Array.from(
    new Set(
      seedCatalog
        .filter((item) => activeCategory === 'All' || item.category === activeCategory)
        .map((item) => item.brand)
    )
  )

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedItem) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setEquipmentImages((prev) => ({
        ...prev,
        [selectedItem.part]: base64String
      }))
      showToast(`Photo uploaded successfully for ${selectedItem.model}!`)
    };
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8 w-full px-6 py-8 font-sans text-slate-100 bg-[#0c0f1d] min-h-full overflow-y-auto scrollbar-thin relative flex flex-col">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-slate-750 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-200 text-xs font-bold font-mono flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${toast.type === 'error' ? 'bg-rose-400' : toast.type === 'info' ? 'bg-indigo-450' : 'bg-emerald-400'} animate-pulse`} />
          {toast.message}
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2.5xl font-black text-white tracking-tight leading-none">
              Equipment Catalog
            </h1>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-indigo-400 border border-indigo-900/30 tracking-widest font-mono">
              Global Database Draft
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            System-level hardware database. Pre-define specs to use across all project Bill of Materials (BOM).
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setIsImportRulesOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          Configure Import Rules
        </button>
      </div>

      {/* Filter and Grouping Bar */}
      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-850 space-y-4">
        
        {/* Search & Grouping Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by brand, model, description, part number, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          {/* Group By selector */}
          <div className="lg:w-56 flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="category" className="bg-slate-950">Category</option>
              <option value="brand" className="bg-slate-950">Brand / Manufacturer</option>
              <option value="type" className="bg-slate-950">Equipment Type</option>
              <option value="none" className="bg-slate-950">None (Full List)</option>
            </select>
          </div>
        </div>

        {/* Dropdowns Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-2xs">
            <span className="text-slate-505 font-semibold text-slate-500">Brand:</span>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-slate-950">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b} className="bg-slate-950">{b}</option>
              ))}
            </select>
          </div>

          {/* Connectivity */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-2xs">
            <span className="text-slate-500 font-semibold">Conn:</span>
            <select
              value={filterConnectivity}
              onChange={(e) => setFilterConnectivity(e.target.value)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-slate-950">All Connectivity</option>
              <option value="Copper" className="bg-slate-950">Copper / RJ45</option>
              <option value="SFP" className="bg-slate-950">SFP / LC</option>
              <option value="Wireless" className="bg-slate-950">Wireless</option>
              <option value="Fibers" className="bg-slate-950">Fibers</option>
            </select>
          </div>

          {/* Power */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-2xs">
            <span className="text-slate-500 font-semibold">Power:</span>
            <select
              value={filterPower}
              onChange={(e) => setFilterPower(e.target.value)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-slate-950">All Power</option>
              <option value="PoE" className="bg-slate-950">PoE / PoE+</option>
              <option value="AC" className="bg-slate-950">AC Power</option>
              <option value="DC" className="bg-slate-950">DC Input</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-2xs">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-slate-950">All Statuses</option>
              <option value="Active" className="bg-slate-950">Active</option>
              <option value="Planned" className="bg-slate-950">Planned</option>
            </select>
          </div>
        </div>

      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4 select-none">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setActiveCategory(c)
              setFilterBrand('All')
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeCategory === c
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 font-extrabold shadow-sm'
                : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:text-white hover:bg-slate-850/50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Main Grouped List / Technical Table */}
      <div className="flex-1 space-y-8 min-h-0">
        {Object.keys(groupedCatalog).length === 0 || Object.values(groupedCatalog).every(arr => arr.length === 0) ? (
          <div className="border border-dashed border-slate-850 rounded-2xl p-16 text-center bg-slate-900/10 max-w-xl mx-auto mt-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-slate-500 border border-slate-800 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><line x1="2" y1="17" x2="22" y2="17"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            </div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">No matching devices</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              No equipment found matching current filter parameters or search term.
            </p>
          </div>
        ) : (
          Object.entries(groupedCatalog).map(([groupName, items]) => {
            if (!items || items.length === 0) return null

            return (
              <div key={groupName} className="space-y-3">
                {/* Group Title Header */}
                <div className="flex items-center gap-2.5 px-1">
                  <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                    {groupName}
                  </h3>
                  <span className="text-[9px] bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-850">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Group Technical Table */}
                <div className="bg-slate-900/15 border border-slate-850 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-medium border-collapse">
                      <thead className="bg-slate-950/60 text-slate-500 uppercase text-[9px] tracking-wider border-b border-slate-850 font-mono select-none">
                        <tr>
                          <th className="px-4 py-3 font-extrabold">Category</th>
                          <th className="px-4 py-3 font-extrabold">Brand</th>
                          <th className="px-4 py-3 font-extrabold">Model</th>
                          <th className="px-4 py-3 font-extrabold">Type</th>
                          <th className="px-4 py-3 font-extrabold">Connectivity</th>
                          <th className="px-4 py-3 font-extrabold">Power</th>
                          <th className="px-4 py-3 font-extrabold">PoE / Draw</th>
                          <th className="px-4 py-3 font-extrabold">Ports</th>
                          <th className="px-4 py-3 font-extrabold">Fiber</th>
                          <th className="px-4 py-3 font-extrabold text-center">Status</th>
                          <th className="px-4 py-3 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60">
                        {items.map((item, idx) => {
                          const isSelected = selectedItem?.part === item.part
                          const hasPhoto = !!equipmentImages[item.part]

                          return (
                            <tr
                              key={item.part || idx}
                              onClick={() => setSelectedItem(item)}
                              className={`transition-all hover:bg-slate-900/50 cursor-pointer ${
                                isSelected ? 'bg-sky-500/5 hover:bg-sky-500/10' : 'bg-transparent'
                              }`}
                            >
                              <td className="px-4 py-2.5 font-bold text-slate-400">{item.category}</td>
                              <td className="px-4 py-2.5 font-mono text-indigo-400 font-extrabold">{item.brand}</td>
                              <td className="px-4 py-2.5 text-white font-extrabold flex items-center gap-1.5">
                                {hasPhoto && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Photo attached" />
                                )}
                                {item.model}
                              </td>
                              <td className="px-4 py-2.5 text-slate-350">{item.type}</td>
                              <td className="px-4 py-2.5 text-slate-450">{item.connectivity}</td>
                              <td className="px-4 py-2.5 text-slate-450">{item.power}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-350 font-bold">{item.poeDraw}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-450">{item.ports}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-450">{item.fiberCount}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedItem(item)}
                                  className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-sky-500/40 text-slate-400 hover:text-sky-400 rounded-md transition text-[9px] font-extrabold uppercase cursor-pointer"
                                >
                                  Specs
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Equipment Detail Drawer (Right side overlay panel) */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 z-40 w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Header area */}
          <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest font-mono bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/20">{selectedItem.category}</span>
              <h3 className="text-base font-black text-white mt-2 leading-tight">{selectedItem.brand} {selectedItem.model}</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Part: {selectedItem.part}</p>
            </div>
            <button 
              onClick={() => setSelectedItem(null)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-850/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Scrollable details list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin select-none">
            
            {/* 1. Photo Upload / Preview section */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Device Photograph</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl h-44 overflow-hidden bg-slate-950/20 flex flex-col items-center justify-center cursor-pointer transition"
              >
                {equipmentImages[selectedItem.part] ? (
                  <>
                    <img 
                      src={equipmentImages[selectedItem.part]} 
                      alt={selectedItem.model}
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-2xs font-extrabold uppercase text-white tracking-widest gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      Replace Image
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <svg className="w-8 h-8 mx-auto text-slate-650 group-hover:text-sky-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-[10px] font-extrabold uppercase text-slate-550 group-hover:text-sky-450 tracking-wider block">Upload Product Photo</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* 2. Technical Specifications fields based on category */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1 border-b border-slate-850">
                Technical Specifications
              </h4>

              {/* Description Spec */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-550 uppercase">Specs Overview</span>
                <p className="text-xs text-slate-350 leading-relaxed font-sans">{selectedItem.spec}</p>
              </div>

              {/* CAMERA FIELDS */}
              {selectedItem.category === 'Cameras' && (
                <div className="grid grid-cols-2 gap-4 font-mono text-[10.5px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Camera Type</span>
                    <strong className="text-slate-200">{selectedItem.type}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Resolution</span>
                    <strong className="text-slate-200">{selectedItem.resolution || '1080p'}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Lens</span>
                    <strong className="text-slate-200">{selectedItem.lens}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Default FOV</span>
                    <strong className="text-slate-200">{selectedItem.fov}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Default Range</span>
                    <strong className="text-slate-200">{selectedItem.range}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">IR Night Vision</span>
                    <strong className="text-slate-200">{selectedItem.nightVision}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Mounting Styles</span>
                    <strong className="text-slate-200">{selectedItem.mount}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Environment</span>
                    <strong className="text-slate-200">{selectedItem.environment}</strong>
                  </div>
                </div>
              )}

              {/* SWITCH FIELDS */}
              {selectedItem.category === 'Switches' && (
                <div className="grid grid-cols-2 gap-4 font-mono text-[10.5px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Switch Type</span>
                    <strong className="text-slate-200">{selectedItem.switchType}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">RJ45 Ports</span>
                    <strong className="text-slate-200">{selectedItem.rj45Ports}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">SFP Ports</span>
                    <strong className="text-slate-200">{selectedItem.sfpPorts}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">PoE Ports</span>
                    <strong className="text-slate-200">{selectedItem.poePorts}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">PoE Budget</span>
                    <strong className="text-slate-200">{selectedItem.poeBudget}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Uplink Speed</span>
                    <strong className="text-slate-200">{selectedItem.speed}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Management</span>
                    <strong className="text-slate-200">{selectedItem.managed}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Industrial Rating</span>
                    <strong className="text-slate-200">{selectedItem.rating}</strong>
                  </div>
                </div>
              )}

              {/* WIRELESS RADIO FIELDS */}
              {selectedItem.category === 'Wireless Radios' && (
                <div className="grid grid-cols-2 gap-4 font-mono text-[10.5px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Frequency Band</span>
                    <strong className="text-slate-200">{selectedItem.frequency}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Max Throughput</span>
                    <strong className="text-slate-200">{selectedItem.throughput}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Antenna Gain</span>
                    <strong className="text-slate-200">{selectedItem.gain}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Effective Range</span>
                    <strong className="text-slate-200">{selectedItem.range}</strong>
                  </div>
                </div>
              )}

              {/* FIBER CABLE FIELDS */}
              {selectedItem.category === 'Fiber Cables' && (
                <div className="grid grid-cols-2 gap-4 font-mono text-[10.5px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Fiber Count</span>
                    <strong className="text-slate-200">{selectedItem.fiberCount} Strands</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Optical Mode</span>
                    <strong className="text-slate-200">{selectedItem.mode}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Cable Structure</span>
                    <strong className="text-slate-200">{selectedItem.cableType}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Armored Sheath</span>
                    <strong className="text-slate-200">{selectedItem.armored}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Environment</span>
                    <strong className="text-slate-200">{selectedItem.outdoorIndoor}</strong>
                  </div>
                </div>
              )}

              {/* COMMON FIELDS FOR OTHERS */}
              {!['Cameras', 'Switches', 'Wireless Radios', 'Fiber Cables'].includes(selectedItem.category) && (
                <div className="grid grid-cols-2 gap-4 font-mono text-[10.5px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Connectivity</span>
                    <strong className="text-slate-200">{selectedItem.connectivity}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Power Standard</span>
                    <strong className="text-slate-200">{selectedItem.power}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">PoE Draw / capacity</span>
                    <strong className="text-slate-200">{selectedItem.poeDraw}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-550 text-[9px] block">Ports Capacity</span>
                    <strong className="text-slate-200">{selectedItem.ports}</strong>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-2 shrink-0">
            <button 
              type="button"
              onClick={() => showToast(`Added ${selectedItem.model} to active project BOM list!`)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-98 cursor-pointer"
            >
              Add to Project Plan
            </button>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <button 
                type="button"
                onClick={() => showToast(`Catalog duplicate draft generated for ${selectedItem.model}.`, 'info')}
                className="py-2 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 rounded-xl transition cursor-pointer"
              >
                Duplicate
              </button>
              <button 
                type="button"
                onClick={() => showToast(`Archiving this catalog template is planned.`, 'info')}
                className="py-2 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 rounded-xl transition cursor-pointer"
              >
                Archive Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Rules Modal */}
      {isImportRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsImportRulesOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Import Rules — Coming Soon</h3>
              <p className="text-[11px] text-slate-450 mt-1 font-medium">This mapping module allows admins to normalize and match distributor/manufacturer spreadsheets.</p>
            </div>
            
            <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl space-y-3.5 text-xs text-slate-455 font-mono">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-550 uppercase">Mapped Fields Schema</span>
                <p className="text-slate-300">Column mapping, manufacturer normalization, model matching, part number matching, default category mapping, duplicate detection.</p>
              </div>

              <div className="pt-2 border-t border-slate-900/60 space-y-1">
                <span className="text-[9px] font-bold text-slate-550 uppercase">Planned Verification Flags</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                  <li>Validate PoE wattage vs. switch budget bounds.</li>
                  <li>Check port count compatibilities.</li>
                  <li>Normalize optical fiber wavelength transceivers.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsImportRulesOpen(false)} className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-350 rounded-xl text-xs font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
