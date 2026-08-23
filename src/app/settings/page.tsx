'use client'

import React, { useState } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function GlobalSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'company' | 'branding' | 'team' | 'preferences' | 'integrations' | 'security' | 'theme'>('general')

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  
  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Technician')

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Preferences saved successfully!')
  }

  const handleExportData = () => {
    try {
      const backupData = {
        version: "1.0",
        exportTimestamp: new Date().toISOString(),
        themePreference: theme,
        branding: {
          companyName: "NextQ Technologies",
          primaryColor: "#4f46e5",
          reportFooter: "NextQ Technologies © 2026. Confidential Infrastructure Proposal."
        },
        preferences: {
          cameraPrefix: "CAM-",
          switchPrefix: "SW-",
          defaultConnectivity: "Fiber Optic backbone",
          measurementUnits: "Imperial"
        }
      }
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute("href", jsonString)
      downloadAnchor.setAttribute("download", `nextq_settings_backup_${Date.now()}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      
      showToast('Settings configuration exported successfully!')
    } catch (err) {
      showToast('Failed to export data', 'error')
    }
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    showToast(`Invitation sent to ${inviteEmail} as ${inviteRole}!`)
    setIsInviteOpen(false)
    setInviteEmail('')
  }

  const handleDeleteCompany = () => {
    showToast('Organization deletion is a locked administrative action.', 'error')
    setIsDeleteConfirmOpen(false)
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'profile', label: 'Profile' },
    { id: 'company', label: 'Company / Organization' },
    { id: 'branding', label: 'Branding' },
    { id: 'team', label: 'Users & Permissions' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'security', label: 'Data & Security' },
    { id: 'theme', label: 'Theme' },
  ] as const

  return (
    <div className="flex-1 flex bg-[#0c0f1d] text-slate-100 font-sans h-full overflow-hidden relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-900 border-emerald-500/30 text-emerald-50' 
            : toast.type === 'error'
              ? 'bg-rose-900 border-rose-500/30 text-rose-50'
              : 'bg-slate-800 border-slate-700 text-slate-100'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          )}
          <span className="text-xs font-bold font-mono">{toast.message}</span>
        </div>
      )}

      {/* Left Settings Tabs Navigation */}
      <aside className="w-56 border-r border-slate-850 p-6 flex flex-col gap-1 select-none shrink-0 h-full overflow-y-auto scrollbar-thin">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-4">
          Global Settings
        </h2>
        
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer border ${
              activeTab === t.id
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 font-extrabold shadow-inner'
                : 'bg-transparent border-transparent text-slate-450 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </aside>

      {/* Main Settings Panel Content */}
      <form onSubmit={handleSave} className="flex-1 p-8 overflow-y-auto scrollbar-thin h-full flex flex-col justify-between max-w-4xl">
        <div className="space-y-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">General Settings</h2>
                <p className="text-xs text-slate-400 mt-1">Configure your workspace defaults and localization preferences.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Language selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Language</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                    <option>English (United States)</option>
                    <option>Español (Latinoamérica)</option>
                  </select>
                </div>

                {/* Time zone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Time Zone</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                    <option>Eastern Standard Time (EST) - GMT-5</option>
                    <option>Pacific Standard Time (PST) - GMT-8</option>
                    <option>Central Standard Time (CST) - GMT-6</option>
                  </select>
                </div>

                {/* Units */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Measurement Units</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                    <option>Imperial (feet, inches)</option>
                    <option>Metric (meters, centimeters)</option>
                  </select>
                </div>

                {/* Map View */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Default Map View</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                    <option>Satellite Hybrid</option>
                    <option>Roadmap Vector</option>
                    <option>Pure Satellite</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Profile Details</h2>
                <p className="text-xs text-slate-400 mt-1">Manage your administrator details and account login email.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 font-extrabold text-sm select-none">
                    MP
                  </div>
                  <button 
                    type="button"
                    onClick={() => showToast('Avatar upload is a planned feature — Coming Soon!', 'info')}
                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-2xs font-extrabold transition tracking-wide uppercase cursor-pointer"
                  >
                    Change Avatar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Full Name</label>
                    <input type="text" defaultValue="Marcelo Poblete" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Role</label>
                    <input type="text" defaultValue="Administrator / Owner" disabled className="bg-slate-900/50 border border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-500 font-semibold cursor-not-allowed" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Email Address (Read-only)</label>
                  <input type="email" defaultValue="marcelopobleteus@gmail.com" disabled className="bg-slate-900/50 border border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-500 font-semibold cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Company / Organization</h2>
                <p className="text-xs text-slate-400 mt-1">Manage global details for company billing and documentation footprints.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Company Name</label>
                  <input type="text" defaultValue="NextQ Technologies" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Physical Address</label>
                  <input type="text" defaultValue="100 Technology Parkway, Suite 400" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Website URL</label>
                    <input type="text" defaultValue="https://nextqtechs.com" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Default Project Type</label>
                    <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                      <option>CCTV Security Layout</option>
                      <option>Fiber Splicing & Routing</option>
                      <option>Hybrid CCTV + Fiber</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Client Branding Options</h2>
                <p className="text-xs text-slate-400 mt-1">Customize report footprints with client logos, primary colors, and footnotes.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">Company Brand Logo</label>
                    <div 
                      onClick={() => showToast('Logo upload is a planned feature — Coming Soon!', 'info')}
                      className="border border-dashed border-slate-850 rounded-2xl p-6 text-center bg-slate-950/20 text-slate-500 text-[10.5px] cursor-pointer hover:border-slate-800 transition"
                    >
                      Upload SVG Logo
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">Primary Color Theme</label>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 border border-indigo-500" />
                      <input type="text" defaultValue="#4f46e5" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white w-24 text-center font-mono font-bold" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Report Footer Text</label>
                  <textarea rows={3} defaultValue="NextQ Technologies © 2026. Confidential Infrastructure Proposal." className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Users & Team Permissions</h2>
                <p className="text-xs text-slate-400 mt-1">Manage team members, roles, and invitation codes.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden">
                  <table className="w-full text-[11px] font-mono text-slate-400">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[9px] tracking-wider border-b border-slate-900">
                      <tr>
                        <th className="text-left px-4 py-3 font-extrabold">Name</th>
                        <th className="text-left px-4 py-3 font-extrabold">Email</th>
                        <th className="text-left px-4 py-3 font-extrabold">Role</th>
                        <th className="text-right px-4 py-3 font-extrabold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      <tr>
                        <td className="px-4 py-3 text-white font-bold">Marcelo Poblete</td>
                        <td className="px-4 py-3">marcelopobleteus@gmail.com</td>
                        <td className="px-4 py-3 text-indigo-400 font-bold">Admin</td>
                        <td className="px-4 py-3 text-right text-emerald-450">Active</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-white font-bold">Field Tech User</td>
                        <td className="px-4 py-3">fieldtech@nextqtechs.com</td>
                        <td className="px-4 py-3 text-amber-500">Technician</td>
                        <td className="px-4 py-3 text-right text-emerald-450">Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  Invite Team Member
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">System Preferences</h2>
                <p className="text-xs text-slate-400 mt-1">Configure asset specifications defaults and prefix naming formulas.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Camera Tag Prefix</label>
                    <input type="text" defaultValue="CAM-" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Switch Tag Prefix</label>
                    <input type="text" defaultValue="SW-" className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Default Connectivity Method</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-bold">
                    <option>Fiber Optic backbone</option>
                    <option>Coaxial copper cable</option>
                    <option>Wireless microwave backhaul</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">System Integrations</h2>
                <p className="text-xs text-slate-400 mt-1">Verify connectivity status to external APIs and databases.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Integration 1 */}
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Google Maps Javascript API</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Used for GIS mapping coordinates and satellite viewports.</p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450">Active</span>
                </div>

                {/* Integration 2 */}
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Supabase Backend Services</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Used for relational databases, storage folders, and RLS.</p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Data & Account Security</h2>
                <p className="text-xs text-slate-400 mt-1">Manage backups, export data sheets, or configure account backups.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                {/* Action 1 */}
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">Export Global Catalog</h4>
                    <p className="text-[10px] text-slate-550 font-mono">Download all hardware specs and organization details in JSON.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:border-sky-500/50 text-slate-300 hover:text-sky-400 rounded-xl text-2xs font-extrabold transition tracking-wide uppercase cursor-pointer"
                  >
                    Export Data
                  </button>
                </div>

                {/* Action 2 */}
                <div className="p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-rose-450">Delete Company Organization</h4>
                    <p className="text-[10px] text-rose-800 font-mono">Wipe all projects, databases, and members permanently.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-950/30 hover:bg-rose-950 border border-rose-900/30 text-rose-450 rounded-xl text-2xs font-extrabold transition tracking-wide uppercase cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-white">Appearance / Theme</h2>
                <p className="text-xs text-slate-400 mt-1">Select how NextQ Infrastructure Designer should appear on this device.</p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xl pt-2">
                {/* Light */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`border rounded-xl p-4 text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer ${
                    theme === 'light'
                      ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-white">Light</span>
                  <div className="h-6 w-full rounded border border-slate-800 bg-white flex items-center px-1.5 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <div className="h-1 flex-1 bg-slate-200 rounded-sm" />
                  </div>
                </button>

                {/* Dark */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`border rounded-xl p-4 text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-white">Dark</span>
                  <div className="h-6 w-full rounded border border-slate-800 bg-slate-950 flex items-center px-1.5 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                    <div className="h-1 flex-1 bg-slate-900 rounded-sm" />
                  </div>
                </button>

                {/* System */}
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`border rounded-xl p-4 text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer ${
                    theme === 'system'
                      ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-white">System</span>
                  <div className="h-6 w-full rounded border border-slate-850 bg-slate-900 flex items-center px-1.5 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <div className="h-1 flex-1 bg-slate-800 rounded-sm" />
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Form footer */}
        <div className="border-t border-slate-850 pt-4 flex justify-end gap-3 mt-8">
          <button 
            type="button" 
            onClick={() => showToast('Defaults restored (unsaved).', 'info')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reset Defaults
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsInviteOpen(false)} />
          <form onSubmit={handleInviteSubmit} className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">Invite Team Member</h3>
              <p className="text-[11px] text-slate-450 mt-1">Send a registration code to join the NextQ workspace.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@company.com" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Workspace Role</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option>Technician</option>
                  <option>Designer</option>
                  <option>Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">Send Invite</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-slate-900 border border-rose-950 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-rose-500 tracking-wider">Wipe Company Organization?</h3>
              <p className="text-[11px] text-slate-450 mt-1">This operation is irreversible. All projects and assets will be purged.</p>
            </div>
            <div className="p-3 bg-rose-950/15 border border-rose-900/20 text-rose-450 rounded-xl text-[10px] leading-relaxed">
              <strong>WARNING:</strong> Active licenses and database integrations for this company will be disabled immediately.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition">Cancel</button>
              <button type="button" onClick={handleDeleteCompany} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition">Confirm Deletion</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
