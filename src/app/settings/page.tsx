'use client'

import React, { useState } from 'react'

export default function GlobalSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'company' | 'branding' | 'team' | 'preferences' | 'integrations' | 'security'>('general')

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
        version: "2.0",
        exportTimestamp: new Date().toISOString(),
        branding: {
          companyName: "NextQ Technologies",
          primaryColor: "#FF6600",
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
  ] as const

  return (
    <div className="flex-1 flex bg-[var(--bg)] text-[var(--text-primary)] font-sans h-full overflow-hidden relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-xl animate-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success' 
            ? 'bg-[var(--surface-1)] border-emerald-200 text-[var(--success)]' 
            : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-[var(--danger)]'
              : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-primary)]'
        }`}>
          <span className="text-xs font-bold font-mono">{toast.message}</span>
        </div>
      )}

      {/* Left Settings Tabs Navigation */}
      <aside className="w-56 border-r border-[var(--border)] p-6 flex flex-col gap-1 select-none shrink-0 h-full overflow-y-auto scrollbar-thin bg-[var(--bg)]">
        <h2 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 mb-3">
          Global Settings
        </h2>
        
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border-l-2 ${
              activeTab === t.id
                ? 'bg-[var(--surface-2)] border-l-[var(--accent)] text-[var(--text-primary)] font-extrabold'
                : 'bg-transparent border-l-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </aside>

      {/* Main Settings Panel Content */}
      <form onSubmit={handleSave} className="flex-1 p-8 overflow-y-auto scrollbar-thin h-full flex flex-col justify-between max-w-4xl bg-[var(--bg)]">
        <div className="space-y-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">General Settings</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Configure your workspace defaults and localization preferences.</p>
              </div>

              <div className="space-y-4 max-w-xl bg-[var(--surface-1)] p-5 border border-[var(--border)] rounded-xl shadow-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Language</label>
                  <select className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer font-bold">
                    <option>English (United States)</option>
                    <option>Español (Latinoamérica)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Time Zone</label>
                  <select className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer font-bold">
                    <option>Eastern Standard Time (EST) - GMT-5</option>
                    <option>Pacific Standard Time (PST) - GMT-8</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Measurement Units</label>
                  <select className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer font-bold">
                    <option>Imperial (feet, inches)</option>
                    <option>Metric (meters, centimeters)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Profile Details</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage your administrator details and account login email.</p>
              </div>

              <div className="space-y-4 max-w-xl bg-[var(--surface-1)] p-5 border border-[var(--border)] rounded-xl shadow-xs">
                <div className="flex items-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] font-extrabold text-sm select-none">
                    MP
                  </div>
                  <button 
                    type="button"
                    onClick={() => showToast('Avatar upload is a planned feature.', 'info')}
                    className="px-3.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Change Avatar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Full Name</label>
                    <input type="text" defaultValue="Marcelo Poblete" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Role</label>
                    <input type="text" defaultValue="Administrator / Owner" disabled className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-tertiary)] font-semibold cursor-not-allowed" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Company / Organization</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage global details for company billing and documentation footprints.</p>
              </div>

              <div className="space-y-4 max-w-xl bg-[var(--surface-1)] p-5 border border-[var(--border)] rounded-xl shadow-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Company Name</label>
                  <input type="text" defaultValue="NextQ Technologies" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Physical Address</label>
                  <input type="text" defaultValue="100 Technology Parkway, Suite 400" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold" />
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Client Branding Options</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Customize report footprints with client logos, primary colors, and footnotes.</p>
              </div>

              <div className="space-y-4 max-w-xl bg-[var(--surface-1)] p-5 border border-[var(--border)] rounded-xl shadow-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider block mb-2">Company Brand Logo</label>
                    <div 
                      onClick={() => showToast('Logo upload coming soon.', 'info')}
                      className="border border-dashed border-[var(--border-strong)] rounded-lg p-6 text-center bg-[var(--surface-2)] text-[var(--text-tertiary)] text-xs cursor-pointer hover:border-[var(--accent)] transition"
                    >
                      Upload SVG Logo
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider block mb-2">Primary Color Theme</label>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)] border border-[var(--accent-border)]" />
                      <input type="text" defaultValue="#FF6600" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] w-24 text-center font-mono font-bold" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Users & Team Permissions</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage team members, roles, and invitation codes.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs font-mono text-[var(--text-secondary)]">
                    <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-bold">Name</th>
                        <th className="text-left px-4 py-2.5 font-bold">Email</th>
                        <th className="text-left px-4 py-2.5 font-bold">Role</th>
                        <th className="text-right px-4 py-2.5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      <tr>
                        <td className="px-4 py-2.5 text-[var(--text-primary)] font-bold font-sans">Marcelo Poblete</td>
                        <td className="px-4 py-2.5">marcelopobleteus@gmail.com</td>
                        <td className="px-4 py-2.5 text-[var(--accent-text)] font-bold">Admin</td>
                        <td className="px-4 py-2.5 text-right text-[var(--success)] font-bold">Active</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[var(--text-primary)] font-bold font-sans">Field Tech User</td>
                        <td className="px-4 py-2.5">fieldtech@nextqtechs.com</td>
                        <td className="px-4 py-2.5 text-[var(--warn)] font-bold">Technician</td>
                        <td className="px-4 py-2.5 text-right text-[var(--success)] font-bold">Active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">System Preferences</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Configure asset specifications defaults and prefix naming formulas.</p>
              </div>

              <div className="space-y-4 max-w-xl bg-[var(--surface-1)] p-5 border border-[var(--border)] rounded-xl shadow-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Camera Tag Prefix</label>
                    <input type="text" defaultValue="CAM-" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Switch Tag Prefix</label>
                    <input type="text" defaultValue="SW-" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono font-bold" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">System Integrations</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Verify connectivity status to external APIs and databases.</p>
              </div>

              <div className="space-y-3 max-w-xl">
                <div className="p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl flex items-center justify-between shadow-xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Google Maps API / OpenStreetMap Fallback</h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono">Hybrid GIS mapping engine enabled.</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">Active</span>
                </div>

                <div className="p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl flex items-center justify-between shadow-xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Supabase Backend Services</h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono">Relational database and auth services active.</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] border border-emerald-200">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Data & Security</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage backups, export data sheets, or configure account security.</p>
              </div>

              <div className="space-y-3 max-w-xl">
                <div className="p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl flex justify-between items-center shadow-xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Export Global Settings & Catalog</h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono">Download all specs in JSON backup format.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Export Data
                  </button>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[var(--danger)]">Delete Company Organization</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono">Wipe all projects and database records permanently.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3.5 py-1.5 bg-[var(--danger)] hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Form footer */}
        <div className="border-t border-[var(--border)] pt-4 flex justify-end gap-3 mt-8">
          <button 
            type="button" 
            onClick={() => showToast('Defaults restored.', 'info')}
            className="px-4 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
          >
            Reset Defaults
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsInviteOpen(false)} />
          <form onSubmit={handleInviteSubmit} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Invite Team Member</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Send a registration code to join the NextQ workspace.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@company.com" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Workspace Role</label>
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-semibold"
                >
                  <option>Technician</option>
                  <option>Designer</option>
                  <option>Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs">Send Invite</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-[var(--surface-1)] border border-red-200 p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--danger)] tracking-wider">Wipe Company Organization?</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">This operation is irreversible. All projects and assets will be purged.</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 text-[var(--danger)] rounded-lg text-xs leading-relaxed font-semibold">
              WARNING: Active licenses and database integrations for this company will be disabled immediately.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="button" onClick={handleDeleteCompany} className="px-4 py-2 bg-[var(--danger)] hover:bg-red-700 text-white rounded-lg text-xs font-bold transition">Confirm Deletion</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
