'use client'

import React, { useState } from 'react'

interface BOMItem {
  id: string
  description: string
  manufacturer: string
  partNumber: string
  category: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  status: string
  isDatabase?: boolean
}

interface BOMClientViewProps {
  projectId: string
  items: BOMItem[]
}

export default function BOMClientView({ projectId, items }: BOMClientViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const categories = ['All', 'Camera', 'Network', 'Fiber', 'Power', 'Mounting', 'Labor', 'Miscellaneous']

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalBOMCost = items.reduce((acc, item) => acc + item.totalCost, 0)
  const fiberOSPSubtotal = items
    .filter(item => item.category.toLowerCase() === 'fiber')
    .reduce((acc, item) => acc + item.totalCost, 0)
  const cameraDeviceSubtotal = items
    .filter(item => ['camera', 'network'].includes(item.category.toLowerCase()))
    .reduce((acc, item) => acc + item.totalCost, 0)
  const laborSubtotal = items
    .filter(item => item.category.toLowerCase() === 'labor')
    .reduce((acc, item) => acc + item.totalCost, 0)
  const totalItemsCount = items.reduce((acc, item) => acc + (item.unit === 'pcs' ? item.quantity : 1), 0)

  const fiberCableLength = items
    .filter(item => item.category.toLowerCase() === 'fiber' && item.unit === 'ft' && (item.description.toLowerCase().includes('cable') || item.description.toLowerCase().includes('fiber')))
    .reduce((acc, item) => acc + item.quantity, 0)

  const conduitLength = items
    .filter(item => item.category.toLowerCase() === 'fiber' && item.unit === 'ft' && item.description.toLowerCase().includes('conduit'))
    .reduce((acc, item) => acc + item.quantity, 0)

  const totalLaborHours = items
    .filter(item => item.category.toLowerCase() === 'labor')
    .reduce((acc, item) => {
      if (item.partNumber === 'LAB-OSP-SPLICING') return acc + item.quantity * 1.5
      if (item.partNumber === 'LAB-OSP-CONDUIT') return acc + item.quantity * 0.08
      if (item.partNumber === 'LAB-OSP-CABLE-PULL') return acc + item.quantity * 0.05
      if (item.partNumber === 'LAB-OSP-NODE-SET') return acc + item.quantity * 8
      return acc
    }, 0)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val)
  }

  const handleExportCSV = () => {
    const headers = ['Description', 'Manufacturer', 'Part Number', 'Category', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Status']
    const rows = filteredItems.map(item => [
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.manufacturer.replace(/"/g, '""')}"`,
      `"${item.partNumber.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.quantity,
      `"${item.unit}"`,
      item.unitCost.toFixed(2),
      item.totalCost.toFixed(2),
      `"${item.status}"`
    ])

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `NextQ_BOM_Export_${projectId.substring(0, 8)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)] w-full font-sans">
      
      {/* Metrics Banner (Stat Cards Spec: upper label, mono big number, surface-1 background) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Total Estimated Cost</span>
          <span className="text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight mt-1">{formatCurrency(totalBOMCost)}</span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">Combined hardware & outside plant</p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div>
            <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider block">Outside Plant (OSP)</span>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight mt-1">{formatCurrency(fiberOSPSubtotal)}</span>
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-2 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Fiber Cable:</span>
              <span className="font-bold text-[var(--text-primary)]">{fiberCableLength.toFixed(1)} ft</span>
            </div>
            <div className="flex justify-between">
              <span>Conduit/HDPE:</span>
              <span className="font-bold text-[var(--text-primary)]">{conduitLength.toFixed(1)} ft</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Devices Subtotal</span>
          <span className="text-2xl font-black text-[var(--success)] font-mono tracking-tight mt-1">{formatCurrency(cameraDeviceSubtotal)}</span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">CCTV Cameras & Network switches</p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-[var(--warn)] uppercase tracking-wider block">Labor & Construction</span>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight mt-1">{formatCurrency(laborSubtotal)}</span>
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-2 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Est. Construction Labor:</span>
              <span className="font-bold text-[var(--text-primary)]">{totalLaborHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between">
              <span>Distinct items count:</span>
              <span className="font-bold text-[var(--text-primary)]">{totalItemsCount} units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Category Selector, Search, CSV Export */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] p-3 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[var(--surface-2)] border-[var(--accent-border)] text-[var(--accent-text)]'
                  : 'bg-[var(--surface-1)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Export Button (Spec: Secondary action button style) */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-end">
          <div className="relative w-full md:w-48">
            <input
              type="text"
              placeholder="Search BOM items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Main Table Component */}
      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)] rounded-xl p-12 text-center bg-[var(--surface-1)] max-w-xl mx-auto mt-4 space-y-3">
          <h3 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">No Items Found</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
            No equipment matching the filter criteria. Place components in Fiber OSP Map or Cameras/Network pages to populate the Bill of Materials.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-tertiary)] border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-6 font-bold">Item Description</th>
                  <th className="py-2.5 px-4 font-bold">Category</th>
                  <th className="py-2.5 px-4 font-bold">Manufacturer</th>
                  <th className="py-2.5 px-4 font-bold">Part Number</th>
                  <th className="py-2.5 px-4 text-center font-bold">Quantity</th>
                  <th className="py-2.5 px-4 text-right font-bold">Unit Cost</th>
                  <th className="py-2.5 px-4 text-right font-bold">Total Cost</th>
                  <th className="py-2.5 px-4 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-3 px-6 font-bold text-[var(--text-primary)]">
                      {item.description}
                      {item.unit === 'ft' && (
                        <span className="block text-[9.5px] text-[var(--text-tertiary)] font-mono mt-0.5 uppercase tracking-wide">
                          OSP Length in Feet (Calculated via Installed Cable Pathway)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {item.manufacturer}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--accent-text)] font-extrabold">
                      {item.partNumber}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[var(--text-primary)] font-bold">
                      {item.quantity.toLocaleString(undefined, { minimumFractionDigits: item.unit === 'ft' ? 2 : 0, maximumFractionDigits: item.unit === 'ft' ? 2 : 0 })}
                      <span className="text-[10px] text-[var(--text-tertiary)] ml-1 lowercase font-normal">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text-secondary)]">
                      {item.unitCost > 0 ? formatCurrency(item.unitCost) : <span className="italic text-[var(--text-tertiary)]">N/A</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--text-primary)] font-extrabold">
                      {item.totalCost > 0 ? formatCurrency(item.totalCost) : <span className="italic text-[var(--text-tertiary)]">N/A</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
