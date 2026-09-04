'use client'

import React, { useState, useMemo } from 'react'

interface HelpCenterClientProps {
  projectId: string
  projectName: string
}

interface HelpArticle {
  id: string
  title: string
  category: 'fiber' | 'network' | 'bom' | 'reports' | 'general'
  categoryLabel: string
  tags: string[]
  content: string
  steps?: string[]
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'delete-camera-drop',
    title: 'How to delete a Camera Drop Cable (dashed orange line)?',
    category: 'fiber',
    categoryLabel: 'Fiber Pathways & GIS Map',
    tags: ['dashed line', 'orange line', 'camera drop', 'drop cable', 'delete', 'remove', 'acometida', 'linea punteada', 'eliminar', 'cam-001', 'clear assignment'],
    content: 'When a camera is patched to a fiber strand, the system draws a dashed line (Drop Cable) connecting the camera location to its source enclosure/splice box on the map. If you need to remove or delete this connection line:',
    steps: [
      'Navigate to the "Fiber Pathways" workspace page from the left sidebar.',
      'In the right-side configuration drawer, click on the "Cameras" tab.',
      'From the "Target Camera" dropdown menu, select the camera you want to edit (e.g., CAM-001).',
      'The "Camera Fiber Summary" card will load below. Scroll to the bottom of the card.',
      'Click the red button labeled "Clear Assignment & Splices" and confirm. The dashed line will disappear from the map.'
    ]
  },
  {
    id: 'draw-fiber-route',
    title: 'How to draw a new Fiber Route?',
    category: 'fiber',
    categoryLabel: 'Fiber Pathways & GIS Map',
    tags: ['draw route', 'conduit', 'pathway', 'nodes', 'vertices', 'dibujar', 'ruta', 'fibra'],
    content: 'Conduit routes connect physical nodes (manholes, cabinets, handholes) to complete the fiber loop. To draw a new segment:',
    steps: [
      'In the top-left map toolbar overlay, click the "Draw Route" button.',
      'Click on any existing node or map location to establish the route start point.',
      'Click sequentially on the map to define bends, curves, or vertices along the path.',
      'Once done, click "Finish Route" in the toolbar to save the segment into the database. Click "Clear" at any time to abort.'
    ]
  },
  {
    id: 'delete-node-route',
    title: 'How to delete a node or route segment?',
    category: 'fiber',
    categoryLabel: 'Fiber Pathways & GIS Map',
    tags: ['delete node', 'delete route', 'remove', 'cleanup', 'bom check', 'borrar', 'eliminar', 'segmento'],
    content: 'If you need to clean up your network layout by removing unused structures or cables:',
    steps: [
      'Ensure you are in "Select" mode on the map toolbar overlay.',
      'Click on the target Node marker or Route polyline to select it.',
      'In the right-side "Props" configuration drawer, scroll down and click "Delete Node" or "Delete Route".',
      'Note: If a route has items associated with the Bill of Materials (BOM) or active fiber strands spliced, the system will prevent deletion. You must unpatch splices or unlink BOM items first.'
    ]
  },
  {
    id: 'topology-drag',
    title: 'How to position devices in the Topology Diagram?',
    category: 'network',
    categoryLabel: 'Network Topology',
    tags: ['drag', 'drop', 'switch', 'topology', 'diagram', 'layout', 'save position', 'arrastrar', 'ubicar', 'switches', 'red'],
    content: 'The logical topology diagram displays connectivity from the gateway core down to each endpoint camera. To customize the visual layout:',
    steps: [
      'Navigate to the "Network" section in the left sidebar.',
      'Click the "Topology Diagram" tab at the top.',
      'Click and hold any node card (e.g., switches, gateway router, NVR, or camera drops).',
      'Drag the element to any position on the canvas and release. Positions are automatically saved to your browser\'s local storage per project.',
      'To restore the clean hierarchical tree layout, click the "Reset Layout" button in the top-right corner.'
    ]
  },
  {
    id: 'assign-port',
    title: 'How to link a camera to a network switch port?',
    category: 'network',
    categoryLabel: 'Network Topology',
    tags: ['port matrix', 'switch port', 'assign camera', 'poe budget', 'matriz', 'puertos', 'conectar', 'camara'],
    content: 'Manage the physical port interfaces on your industrial and core network switches:',
    steps: [
      'Navigate to the "Network" section in the left sidebar.',
      'Ensure you are on the "Port Matrix" tab.',
      'Select the target switch from the dropdown menu to load its port grid.',
      'Find an open port (marked green or down) and use the select menu to pick an unassigned camera.',
      'Click the "Assign" action to hook the camera up. The system will calculate PoE draw and sound alarms if power exceeds budget.'
    ]
  },
  {
    id: 'bom-export',
    title: 'How to manage and export Bill of Materials (BOM)?',
    category: 'bom',
    categoryLabel: 'Inventory & Materials',
    tags: ['bom', 'bill of materials', 'catalog', 'pricing', 'inventory', 'materials', 'export', 'materiales'],
    content: 'Review physical items, pricing formulas, and physical elements included in the design:',
    steps: [
      'Click on "Bill of Materials" in the left sidebar under the Inventory category.',
      'Review calculated metrics (e.g. total feet of fiber cable, camera mounts, switches, enclosures).',
      'To export the inventory list, use your browser\'s print feature or the download actions at the top of the BOM list.'
    ]
  },
  {
    id: 'print-pdf',
    title: 'How to generate clean PDF reports?',
    category: 'reports',
    categoryLabel: 'Reports & Delivery',
    tags: ['print pdf', 'save pdf', 'report pdf', 'export', 'r-fib-04', 'imprimir', 'guardar', 'pdf'],
    content: 'Export clean engineering summaries to share with installation crews or administrators:',
    steps: [
      'Navigate to the "Reports" page in the left sidebar.',
      'Click "Open Report" on your desired template (e.g., Fiber Pathways & Nodes Report).',
      'At the top right of the report viewport, click the "Print / Save PDF" button.',
      'In the browser print settings modal, select "Save as PDF" as the destination. Margin optimizations, page breaks, and sidebars are automatically handled.'
    ]
  }
]

export default function HelpCenterClient({ projectId, projectName }: HelpCenterClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Search filter logic
  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return HELP_ARTICLES.filter(article => {
      // Category filter
      if (selectedCategory !== 'all' && article.category !== selectedCategory) {
        return false
      }

      // Search query filter
      if (!query) return true

      const matchesTitle = article.title.toLowerCase().includes(query)
      const matchesContent = article.content.toLowerCase().includes(query)
      const matchesTags = article.tags.some(tag => tag.toLowerCase().includes(query))
      const matchesSteps = article.steps?.some(step => step.toLowerCase().includes(query)) || false

      return matchesTitle || matchesContent || matchesTags || matchesSteps
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full w-full bg-[var(--bg)] font-sans">
      
      {/* Header Banner */}
      <div className="border-b border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-2)] px-8 py-6 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase bg-slate-100 dark:bg-[var(--surface-1)] text-sky-600 dark:text-[var(--accent-text)] border border-sky-200 dark:border-sky-500/10">
                Support & Guides
              </span>
            </div>
            <h2 className="text-2.5xl font-black text-slate-900 dark:text-[var(--text-primary)] mt-2 tracking-tight leading-none">
              ProjectIQ Help Center
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1 font-medium">
              Browse guides, lookup design workflows, and resolve layout issues for <span className="text-indigo-600 dark:text-[var(--accent-text)] font-bold">{projectName}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Support Grid */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin space-y-6">
        
        {/* Search Bar Widget */}
        <div className="bg-white dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-2xl p-5 shadow-xl max-w-3xl">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search help articles (e.g. 'delete camera', 'linea punteada', 'port matrix')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)] rounded-xl text-sm text-slate-900 dark:text-[var(--text-primary)] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-secondary)] hover:text-slate-700 dark:text-[var(--text-tertiary)] dark:hover:text-[var(--text-primary)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Quick Filter Categories */}
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-wider mr-2">Filter Category:</span>
            {[
              { id: 'all', label: 'All Articles' },
              { id: 'fiber', label: 'Fiber & GIS Map' },
              { id: 'network', label: 'Network & Topology' },
              { id: 'bom', label: 'Materials & BOM' },
              { id: 'reports', label: 'Reports & PDF' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-2xs font-bold uppercase transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--accent)] text-white text-[var(--text-primary)] shadow-inner'
                    : 'bg-slate-100 dark:bg-[var(--surface-1)] text-slate-600 dark:text-[var(--text-secondary)] hover:text-slate-900 dark:hover:text-[var(--text-primary)] border border-slate-200 dark:border-[var(--border)]/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-mono flex justify-between items-center max-w-3xl">
          <span>Showing {filteredArticles.length} guides matching criteria</span>
        </div>

        {/* Articles List */}
        <div className="space-y-4 max-w-3xl">
          {filteredArticles.map(article => (
            <div key={article.id} className="bg-white dark:bg-[var(--surface-1)]/20 border border-slate-200 dark:border-[var(--border)] hover:border-slate-300 dark:hover:border-[var(--border)] rounded-2xl p-6 transition-all shadow-sm space-y-4">
              
              {/* Category & Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-[var(--surface-2)] text-indigo-600 dark:text-[var(--accent-text)] border border-indigo-200 dark:border-indigo-900/20">
                  {article.categoryLabel}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[var(--text-primary)] leading-tight">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {article.content}
                </p>
              </div>

              {/* Step By Step Instructions */}
              {article.steps && article.steps.length > 0 && (
                <div className="bg-slate-50 dark:bg-[var(--surface-2)] border border-slate-200 dark:border-[var(--border)]/60 p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-mono text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] uppercase tracking-widest border-b border-slate-200 dark:border-[var(--border)] pb-1.5 mb-2">
                    Step-by-step Guide
                  </h4>
                  <ol className="space-y-2 text-xs">
                    {article.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 text-slate-700 dark:text-[var(--text-primary)] leading-relaxed">
                        <span className="font-mono font-bold text-indigo-600 dark:text-[var(--accent-text)] shrink-0 select-none">
                          {idx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="bg-slate-50 dark:bg-[var(--surface-1)]/10 border border-slate-200 dark:border-[var(--border)] border-dashed rounded-2xl p-12 text-center max-w-3xl">
              <svg className="w-8 h-8 text-[var(--text-secondary)] dark:text-slate-700 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h5 className="text-sm font-bold text-slate-700 dark:text-[var(--text-secondary)]">No matching articles found</h5>
              <p className="text-xs text-slate-600 dark:text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">Try typing a different keyword like 'drop', 'punteada', 'switch', or check filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
