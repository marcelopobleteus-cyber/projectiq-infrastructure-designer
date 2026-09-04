'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recalculateProjectLabor, LaborRecalcResult } from '../../actions-labor'

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
  /** Quien compra el material. 'owner' = OFCI, lo provee el cliente. */
  supplyResponsibility?: 'contractor' | 'owner' | 'other_contractor'
  suppliedBy?: string | null
  materialReceived?: boolean
}

interface BOMClientViewProps {
  projectId: string
  items: BOMItem[]
}

export default function BOMClientView({ projectId, items }: BOMClientViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const router = useRouter()

  // Recalculo de mano de obra: siempre se previsualiza antes de escribir.
  const [laborPreview, setLaborPreview] = useState<LaborRecalcResult | null>(null)
  const [laborBusy, setLaborBusy] = useState(false)

  const handlePreviewLabor = async () => {
    setLaborBusy(true)
    try {
      const res = await recalculateProjectLabor({ projectId, apply: false })
      setLaborPreview(res)
    } catch {
      setLaborPreview({
        changes: [], currentLaborTotal: 0, newLaborTotal: 0, missingRates: [],
        applied: false, error: 'Could not calculate the labor update.',
      })
    } finally {
      setLaborBusy(false)
    }
  }

  const handleApplyLabor = async () => {
    setLaborBusy(true)
    try {
      const res = await recalculateProjectLabor({ projectId, apply: true })
      if (res.error) {
        setLaborPreview(res)
      } else {
        setLaborPreview(null)
        // El BOM se arma en el servidor: hay que recargarlo para ver el cambio.
        router.refresh()
      }
    } catch {
      setLaborPreview(prev => prev && { ...prev, error: 'Could not apply the labor update.' })
    } finally {
      setLaborBusy(false)
    }
  }


  const categories = ['All', 'Camera', 'Network', 'Fiber', 'Power', 'Mounting', 'Labor', 'Miscellaneous']

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Lo que provee el cliente (OFCI) NO entra en lo que cobramos, pero SI
  // aparece en el BOM: el as-built tiene que estar completo para poder
  // entregar como quedo conectado.
  const isOwnerFurnished = (i: BOMItem) =>
    i.supplyResponsibility != null && i.supplyResponsibility !== 'contractor'

  const ownerFurnishedItems = items.filter(isOwnerFurnished)
  const contractorItems = items.filter(i => !isOwnerFurnished(i))

  const ownerFurnishedValue = ownerFurnishedItems.reduce((acc, i) => acc + i.totalCost, 0)
  const ofciPending = ownerFurnishedItems.filter(i => !i.materialReceived).length

  const totalBOMCost = contractorItems.reduce((acc, item) => acc + item.totalCost, 0)
  const fiberOSPSubtotal = contractorItems
    .filter(item => item.category.toLowerCase() === 'fiber')
    .reduce((acc, item) => acc + item.totalCost, 0)
  const cameraDeviceSubtotal = contractorItems
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
    const headers = ['Description', 'Manufacturer', 'Part Number', 'Category', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Status', 'Supplied By', 'Received']
    const rows = filteredItems.map(item => [
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.manufacturer.replace(/"/g, '""')}"`,
      `"${item.partNumber.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.quantity,
      `"${item.unit}"`,
      item.unitCost.toFixed(2),
      item.totalCost.toFixed(2),
      `"${item.status}"`,
      `"${isOwnerFurnished(item) ? (item.suppliedBy || 'Client (OFCI)') : 'Contractor (CFCI)'}"`,
      `"${isOwnerFurnished(item) ? (item.materialReceived ? 'Yes' : 'Pending') : 'n/a'}"`
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
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Billable to Client</span>
          <span className="text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight mt-1">{formatCurrency(totalBOMCost)}</span>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            {ownerFurnishedItems.length > 0
              ? `Excludes ${formatCurrency(ownerFurnishedValue)} furnished by the client`
              : 'Material and labor we buy and install'}
          </p>
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
          {/* Las lineas de mano de obra conservan el precio con que se crearon.
              Este boton es la accion explicita para ponerlas al dia tras
              cambiar una tarifa — siempre previsualizando antes de aplicar. */}
          <button
            onClick={handlePreviewLabor}
            disabled={laborBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] disabled:opacity-50 border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3"/><polyline points="21 3 21 8 16 8"/><polyline points="3 21 3 16 8 16"/></svg>
            {laborBusy ? 'CHECKING…' : 'RECALC LABOR'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Material del cliente pendiente de llegar. Sin esto la cuadrilla
          llega a terreno y no puede instalar — es el aviso que evita el viaje
          perdido, y por eso va arriba y no escondido en la tabla. */}
      {ofciPending > 0 && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] border-l-2 border-l-[var(--warn)] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {ofciPending} client-furnished {ofciPending === 1 ? 'item has' : 'items have'} not been received on site
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Reference value: {formatCurrency(ownerFurnishedValue)} · not billed
          </span>
        </div>
      )}

      {/* Previsualizacion del recalculo de mano de obra */}
      {laborPreview && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">Labor Recalculation</h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Nothing saved yet. Review the change before applying it.
              </p>
            </div>
            <button
              onClick={() => setLaborPreview(null)}
              className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
          </div>

          {laborPreview.error ? (
            <div className="px-4 py-4">
              <p className="text-xs text-[var(--danger)] font-semibold">{laborPreview.error}</p>
            </div>
          ) : laborPreview.changes.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-xs text-[var(--text-secondary)]">
                Labor is already up to date with the current rates. Nothing to change.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--surface-2)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Change</th>
                      <th className="text-left px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Element</th>
                      <th className="text-left px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Work</th>
                      <th className="text-right px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Rate</th>
                      <th className="text-right px-4 py-2 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborPreview.changes.map((c, i) => (
                      <tr key={`${c.code}-${c.elementTag}-${i}`} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${
                            c.action === 'add' ? 'text-[var(--success)]'
                            : c.action === 'remove' ? 'text-[var(--danger)]'
                            : 'text-[var(--accent-text)]'
                          }`}>
                            {c.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-secondary)]">{c.elementTag}</td>
                        <td className="px-4 py-2.5 text-[var(--text-primary)]">{c.description}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px]">
                          {c.oldRate !== null && c.newRate !== null && c.oldRate !== c.newRate ? (
                            <>
                              <span className="text-[var(--text-tertiary)] line-through">{formatCurrency(c.oldRate)}</span>
                              <span className="text-[var(--text-primary)] font-bold"> → {formatCurrency(c.newRate)}</span>
                            </>
                          ) : (
                            <span className="text-[var(--text-primary)]">{formatCurrency(c.newRate ?? c.oldRate ?? 0)}</span>
                          )}
                          <span className="text-[var(--text-tertiary)]">/{c.unit}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] font-bold text-[var(--text-primary)]">
                          {formatCurrency(c.newTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {laborPreview.missingRates.length > 0 && (
                <div className="px-4 py-3 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--warn)] font-semibold">
                    No rate defined, so these go uncharged: {laborPreview.missingRates.join(', ')}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <div className="text-[11px] font-mono text-[var(--text-secondary)] flex-1">
                  Labor total:{' '}
                  <span className="text-[var(--text-tertiary)] line-through">{formatCurrency(laborPreview.currentLaborTotal)}</span>
                  <span className="text-[var(--text-primary)] font-bold"> → {formatCurrency(laborPreview.newLaborTotal)}</span>
                  <span className={`ml-2 font-bold ${
                    laborPreview.newLaborTotal >= laborPreview.currentLaborTotal ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    ({laborPreview.newLaborTotal >= laborPreview.currentLaborTotal ? '+' : ''}
                    {formatCurrency(laborPreview.newLaborTotal - laborPreview.currentLaborTotal)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyLabor}
                    disabled={laborBusy}
                    className="px-3.5 py-2 bg-[var(--accent)] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    {laborBusy ? 'Applying…' : `Apply ${laborPreview.changes.length} change${laborPreview.changes.length > 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => setLaborPreview(null)}
                    disabled={laborBusy}
                    className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
                      {/* OFCI: the line exists for the as-built, but is not billed.
                          Se marca en la fila para que nadie la sume al cotizar. */}
                      {isOwnerFurnished(item) && (
                        <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-strong)] align-middle">
                          OFCI · {item.suppliedBy || 'Client'}
                          {!item.materialReceived && (
                            <span className="text-[var(--warn)]">· pending</span>
                          )}
                        </span>
                      )}
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
                    <td className={`py-3 px-4 text-right font-mono ${isOwnerFurnished(item) ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>
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
