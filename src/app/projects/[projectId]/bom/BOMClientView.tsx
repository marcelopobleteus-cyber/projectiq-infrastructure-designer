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

  // Filter items based on category and search query
  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Calculations for summary metrics
  const totalBOMCost = items.reduce((acc, item) => acc + item.totalCost, 0)
  const fiberOSPSubtotal = items
    .filter(item => item.category.toLowerCase() === 'fiber')
    .reduce((acc, item) => acc + item.totalCost, 0)
  const cameraDeviceSubtotal = items
    .filter(item => ['camera', 'network'].includes(item.category.toLowerCase()))
    .reduce((acc, item) => acc + item.totalCost, 0)
  const totalItemsCount = items.reduce((acc, item) => acc + (item.unit === 'pcs' ? item.quantity : 1), 0)

  // Currency Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val)
  }

  // CSV Export handler
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
    link.setAttribute('download', `ProjectIQ_BOM_Export_${projectId.substring(0, 8)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 text-slate-300 w-full">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
          <span className="text-[10px] font-bold text-slate-555 uppercase tracking-wider block">Total Estimated Cost</span>
          <span className="text-2xl font-black text-white font-mono tracking-tight mt-1">{formatCurrency(totalBOMCost)}</span>
          <p className="text-[9px] text-slate-500 mt-2">Combined hardware & outside plant</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
          <span className="text-[10px] font-bold text-slate-555 uppercase tracking-wider block">Fiber & OSP Subtotal</span>
          <span className="text-2xl font-black text-indigo-400 font-mono tracking-tight mt-1">{formatCurrency(fiberOSPSubtotal)}</span>
          <p className="text-[9px] text-indigo-500/80 mt-2">HDPE, Fiber cables, Handholes</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
          <span className="text-[10px] font-bold text-slate-555 uppercase tracking-wider block">Devices Subtotal</span>
          <span className="text-2xl font-black text-emerald-450 font-mono tracking-tight mt-1">{formatCurrency(cameraDeviceSubtotal)}</span>
          <p className="text-[9px] text-emerald-500/80 mt-2">CCTV Cameras & Network switches</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
          <span className="text-[10px] font-bold text-slate-555 uppercase tracking-wider block">Procured Items (Qty)</span>
          <span className="text-2xl font-black text-slate-200 font-mono tracking-tight mt-1">{totalItemsCount}</span>
          <p className="text-[9px] text-slate-500 mt-2">Total distinct units specified</p>
        </div>
      </div>

      {/* Control Bar: Category Selector, Search, CSV Export */}
      <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-650 text-white shadow-inner shadow-indigo-950/20'
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-850/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-end">
          <div className="relative w-full md:w-48">
            <input
              type="text"
              placeholder="Search BOM items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all shrink-0 shadow-lg hover:shadow-indigo-900/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Main BOM Listing Table */}
      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-slate-850 rounded-2xl p-16 text-center bg-slate-900/10 backdrop-blur-sm max-w-xl mx-auto mt-6 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-850 text-slate-555">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Items Found</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              No equipment matching the filter criteria. Place components in Fiber OSP Map or Cameras/Network pages to populate the Bill of Materials.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-850 font-mono text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-6">Item Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Part Number</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-855/15 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-200">
                      {item.description}
                      {item.unit === 'ft' && (
                        <span className="block text-[9px] text-slate-500 font-semibold font-mono mt-0.5 uppercase tracking-wide">
                          OSP Length in Feet (Calculated via Installed Cable Pathway)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.category.toLowerCase() === 'fiber' ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/10' :
                        item.category.toLowerCase() === 'camera' ? 'bg-emerald-950 text-emerald-450 border border-emerald-500/10' :
                        item.category.toLowerCase() === 'network' ? 'bg-blue-950 text-blue-400 border border-blue-500/10' :
                        'bg-slate-955 text-slate-400 border border-slate-800'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-350">
                      {item.manufacturer}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-350">
                      {item.partNumber}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-white">
                      {item.quantity.toLocaleString(undefined, { minimumFractionDigits: item.unit === 'ft' ? 2 : 0, maximumFractionDigits: item.unit === 'ft' ? 2 : 0 })}
                      <span className="text-[10px] text-slate-500 ml-1 font-semibold lowercase">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-350">
                      {item.unitCost > 0 ? formatCurrency(item.unitCost) : <span className="italic text-slate-555">N/A</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white font-semibold">
                      {item.totalCost > 0 ? formatCurrency(item.totalCost) : <span className="italic text-slate-555">N/A</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        item.status.toLowerCase() === 'active' 
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/10' 
                          : 'bg-slate-800 text-slate-400 border-slate-700/50'
                      }`}>
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
