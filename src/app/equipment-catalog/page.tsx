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

  const filteredItems = seedCatalog.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false

    const query = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      item.model.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      (item.part && item.part.toLowerCase().includes(query)) ||
      (item.spec && item.spec.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)

    if (!matchesSearch) return false
    if (filterBrand !== 'All' && item.brand !== filterBrand) return false
    if (filterConnectivity !== 'All' && !item.connectivity.toLowerCase().includes(filterConnectivity.toLowerCase())) return false
    if (filterPower !== 'All' && !item.power.toLowerCase().includes(filterPower.toLowerCase())) return false
    if (filterStatus !== 'All' && item.status !== filterStatus) return false

    return true
  })

  const getGroupedItems = () => {
    if (groupBy === 'none') return { 'All Items': filteredItems }
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

  const uniqueBrands = Array.from(
    new Set(
      seedCatalog
        .filter((item) => activeCategory === 'All' || item.category === activeCategory)
        .map((item) => item.brand)
    )
  )

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
    <div className="space-y-6 w-full px-6 py-8 font-sans text-[var(--text-primary)] bg-[var(--bg)] min-h-full overflow-y-auto scrollbar-thin relative flex flex-col">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)] px-4 py-3 rounded-xl shadow-xl text-xs font-bold font-mono flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-[var(--danger)]' : toast.type === 'info' ? 'bg-[var(--accent)]' : 'bg-[var(--success)]'} animate-pulse`} />
          {toast.message}
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
              Equipment Catalog
            </h1>
            <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent-border)] tracking-wider font-mono">
              Hardware Library
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            System-level hardware database. Pre-define specs to use across all project Bill of Materials (BOM).
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setIsImportRulesOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          Configure Import Rules
        </button>
      </div>

      {/* Filter and Grouping Bar */}
      <div className="bg-[var(--surface-1)] p-4 rounded-xl border border-[var(--border)] space-y-3 shadow-xs">
        
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by brand, model, description, part number, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div className="lg:w-56 flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 rounded-lg text-xs">
            <span className="text-[var(--text-tertiary)] font-medium">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="category" className="bg-white">Category</option>
              <option value="brand" className="bg-white">Brand / Manufacturer</option>
              <option value="type" className="bg-white">Equipment Type</option>
              <option value="none" className="bg-white">None (Full List)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className="text-[var(--text-tertiary)] font-semibold">Brand:</span>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-white">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b} className="bg-white">{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className="text-[var(--text-tertiary)] font-semibold">Conn:</span>
            <select
              value={filterConnectivity}
              onChange={(e) => setFilterConnectivity(e.target.value)}
              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-white">All Connectivity</option>
              <option value="Copper" className="bg-white">Copper / RJ45</option>
              <option value="SFP" className="bg-white">SFP / LC</option>
              <option value="Wireless" className="bg-white">Wireless</option>
              <option value="Fibers" className="bg-white">Fibers</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className="text-[var(--text-tertiary)] font-semibold">Power:</span>
            <select
              value={filterPower}
              onChange={(e) => setFilterPower(e.target.value)}
              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-white">All Power</option>
              <option value="PoE" className="bg-white">PoE / PoE+</option>
              <option value="AC" className="bg-white">AC Power</option>
              <option value="DC" className="bg-white">DC Input</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
            <span className="text-[var(--text-tertiary)] font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
            >
              <option value="All" className="bg-white">All Statuses</option>
              <option value="Active" className="bg-white">Active</option>
              <option value="Planned" className="bg-white">Planned</option>
            </select>
          </div>
        </div>

      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3 select-none">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setActiveCategory(c)
              setFilterBrand('All')
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              activeCategory === c
                ? 'bg-[var(--surface-2)] border-[var(--accent-border)] text-[var(--accent-text)]'
                : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Main Table Spec: --surface-2 header, uppercase --text-tertiary, border-bottom 1px solid var(--border) */}
      <div className="flex-1 space-y-6 min-h-0">
        {Object.keys(groupedCatalog).length === 0 || Object.values(groupedCatalog).every(arr => arr.length === 0) ? (
          <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl mx-auto mt-4 font-sans">
            <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">No matching devices</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
              No equipment found matching current filter parameters or search term.
            </p>
          </div>
        ) : (
          Object.entries(groupedCatalog).map(([groupName, items]) => {
            if (!items || items.length === 0) return null

            return (
              <div key={groupName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-wider">
                    {groupName}
                  </h3>
                  <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-secondary)] font-bold px-2 py-0.5 rounded-full font-mono border border-[var(--border)]">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Table Component */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium border-collapse">
                      <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-mono select-none">
                        <tr>
                          <th className="px-4 py-2.5 font-bold">Category</th>
                          <th className="px-4 py-2.5 font-bold">Brand</th>
                          <th className="px-4 py-2.5 font-bold">Model</th>
                          <th className="px-4 py-2.5 font-bold">Type</th>
                          <th className="px-4 py-2.5 font-bold">Connectivity</th>
                          <th className="px-4 py-2.5 font-bold">Power</th>
                          <th className="px-4 py-2.5 font-bold">PoE / Draw</th>
                          <th className="px-4 py-2.5 font-bold">Ports</th>
                          <th className="px-4 py-2.5 font-bold">Fiber</th>
                          <th className="px-4 py-2.5 font-bold text-center">Status</th>
                          <th className="px-4 py-2.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {items.map((item, idx) => {
                          const isSelected = selectedItem?.part === item.part
                          const hasPhoto = !!equipmentImages[item.part]

                          return (
                            <tr
                              key={item.part || idx}
                              onClick={() => setSelectedItem(item)}
                              className={`transition-all hover:bg-[var(--surface-hover)] cursor-pointer ${
                                isSelected ? 'bg-[var(--surface-2)]' : 'bg-transparent'
                              }`}
                            >
                              <td className="px-4 py-2.5 font-semibold text-[var(--text-secondary)]">{item.category}</td>
                              <td className="px-4 py-2.5 font-mono text-[var(--accent-text)] font-extrabold">{item.brand}</td>
                              <td className="px-4 py-2.5 text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                                {hasPhoto && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title="Photo attached" />
                                )}
                                {item.model}
                              </td>
                              <td className="px-4 py-2.5 text-[var(--text-secondary)]">{item.type}</td>
                              <td className="px-4 py-2.5 text-[var(--text-secondary)]">{item.connectivity}</td>
                              <td className="px-4 py-2.5 text-[var(--text-secondary)]">{item.power}</td>
                              <td className="px-4 py-2.5 font-mono text-[var(--text-primary)] font-bold">{item.poeDraw}</td>
                              <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">{item.ports}</td>
                              <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">{item.fiberCount}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedItem(item)}
                                  className="px-2 py-1 bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--accent-text)] rounded-md transition text-[10px] font-bold cursor-pointer"
                                >
                                  Specs →
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

      {/* Equipment Detail Overlay Drawer */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 z-40 w-[420px] bg-[var(--surface-1)] border-l border-[var(--border)] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-150">
          <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-2)] flex justify-between items-start">
            <div>
              <span className="text-[9px] font-bold uppercase text-[var(--accent-text)] tracking-wider font-mono bg-[var(--accent-soft)] px-2 py-0.5 rounded border border-[var(--accent-border)]">{selectedItem.category}</span>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] mt-1.5 leading-tight">{selectedItem.brand} {selectedItem.model}</h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">Part: {selectedItem.part}</p>
            </div>
            <button 
              onClick={() => setSelectedItem(null)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin select-none">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Device Photograph</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative border border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] rounded-xl h-40 overflow-hidden bg-[var(--surface-2)] flex flex-col items-center justify-center cursor-pointer transition"
              >
                {equipmentImages[selectedItem.part] ? (
                  <>
                    <img 
                      src={equipmentImages[selectedItem.part]} 
                      alt={selectedItem.model}
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-[var(--surface-1)] opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-bold text-white uppercase tracking-wider">
                      Replace Image
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider block">Upload Product Photo</span>
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

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pb-1 border-b border-[var(--border)]">
                Technical Specifications
              </h4>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Specs Overview</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">{selectedItem.spec}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] font-sans font-bold text-[var(--text-tertiary)] block uppercase">Connectivity</span>
                  <strong className="text-[var(--text-primary)]">{selectedItem.connectivity}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9.5px] font-sans font-bold text-[var(--text-tertiary)] block uppercase">Power Standard</span>
                  <strong className="text-[var(--text-primary)]">{selectedItem.power}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9.5px] font-sans font-bold text-[var(--text-tertiary)] block uppercase">PoE Draw</span>
                  <strong className="text-[var(--text-primary)]">{selectedItem.poeDraw}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9.5px] font-sans font-bold text-[var(--text-tertiary)] block uppercase">Ports Capacity</span>
                  <strong className="text-[var(--text-primary)]">{selectedItem.ports}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-2 shrink-0">
            <button 
              type="button"
              onClick={() => showToast(`Added ${selectedItem.model} to active project BOM list!`)}
              className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Add to Project Plan
            </button>
          </div>
        </div>
      )}

      {/* Import Rules Modal */}
      {isImportRulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setIsImportRulesOpen(false)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Import Rules</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">This mapping module allows admins to normalize distributor spreadsheets.</p>
            </div>
            
            <div className="bg-[var(--surface-2)] p-4 border border-[var(--border)] rounded-lg space-y-2 text-xs text-[var(--text-secondary)]">
              <p>Planned Verification Flags:</p>
              <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px]">
                <li>Validate PoE wattage vs. switch budget bounds.</li>
                <li>Check port count compatibilities.</li>
                <li>Normalize optical fiber wavelength transceivers.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setIsImportRulesOpen(false)} className="px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
