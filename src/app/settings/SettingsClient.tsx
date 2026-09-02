'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  getOrganizationTeamData,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  revokeInvite,
  updateWorkspaceName,
  getLaborRates,
  setLaborRate,
  OrganizationTeamData,
  TeamMemberItem,
  PendingInviteItem,
  LaborRateItem,
} from './actions'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function SettingsClient({ initialTeamData }: { initialTeamData: OrganizationTeamData }) {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'company' | 'branding' | 'team' | 'rates' | 'preferences' | 'integrations' | 'security'>('general')

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)

  // Real team data state — seeded from the server-rendered initial fetch, so the
  // page never has to show a loading state on first paint. loadTeamData() is kept
  // below for manual refreshes (after a mutation, or an explicit "Try again").
  const [teamData, setTeamData] = useState<OrganizationTeamData | null>(initialTeamData)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [teamLoadError, setTeamLoadError] = useState(false)

  // General tab — editable workspace name
  const [workspaceName, setWorkspaceName] = useState(initialTeamData.organizationName || '')
  const [isSavingName, setIsSavingName] = useState(false)

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [isInviting, setIsInviting] = useState(false)

  // Member deletion state
  // Tarifas de mano de obra. Los borradores se guardan aparte de la lista
  // cargada para poder mostrar Save/Discard reales y no perder el valor
  // original mientras se edita.
  const [laborRates, setLaborRates] = useState<LaborRateItem[]>([])
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({})
  const [loadingRates, setLoadingRates] = useState(false)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [canEditRates, setCanEditRates] = useState(false)
  const [savingRate, setSavingRate] = useState<string | null>(null)
  const ratesRequested = useRef(false)

  const [memberToRemove, setMemberToRemove] = useState<TeamMemberItem | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Manual refresh only (post-mutation, or the "Try again" button) — the initial
  // load comes from the server-rendered `initialTeamData` prop, not from this.
  const loadTeamData = async () => {
    setLoadingTeam(true)
    setTeamLoadError(false)
    try {
      const data = await getOrganizationTeamData()
      setTeamData(data)
    } catch (e) {
      console.error('Error loading team data:', e)
      setTeamLoadError(true)
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    const res = await inviteTeamMember(inviteEmail, inviteRole)
    setIsInviting(false)

    if (res.error) {
      showToast(res.error, 'error')
    } else {
      // The invite row can be saved while the email fails to leave. Say which happened.
      if (res.warning) {
        showToast(res.warning, 'error')
      } else {
        showToast(`Invitation sent to ${inviteEmail}!`)
      }
      setIsInviteOpen(false)
      setInviteEmail('')
      loadTeamData()
    }
  }

  const handleSaveWorkspaceName = async () => {
    const next = workspaceName.trim()
    if (!next || next === teamData?.organizationName) return

    setIsSavingName(true)
    const res = await updateWorkspaceName(next)
    setIsSavingName(false)

    if (res.error) {
      showToast(res.error, 'error')
      return
    }

    showToast('Workspace name updated.')
    setTeamData(prev => (prev ? { ...prev, organizationName: next } : prev))
  }

  const handleRoleChange = async (memberId: string, newRole: any) => {
    const res = await updateMemberRole(memberId, newRole)
    if (res.error) {
      showToast(res.error, 'error')
    } else {
      showToast('Member role updated successfully!')
      loadTeamData()
    }
  }

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    const res = await removeMember(memberToRemove.id)
    setIsRemoving(false)
    setMemberToRemove(null)

    if (res.error) {
      showToast(res.error, 'error')
    } else {
      showToast('Member removed from organization.')
      loadTeamData()
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await revokeInvite(inviteId)
    if (res.error) {
      showToast(res.error, 'error')
    } else {
      showToast('Invitation revoked.')
      loadTeamData()
    }
  }

  // Carga diferida: las tarifas solo se piden cuando se abre su pestana.
  //
  // El guardia va en un ref, NO en las dependencias. Tener `loadingRates` en
  // deps hacia que el propio efecto se cancelara solo: lo ponia en true, eso
  // cambiaba las deps, React corria la limpieza del efecto anterior marcando
  // cancelled = true, y la respuesta llegaba sin nadie escuchando. La pantalla
  // quedaba en "Loading rates..." para siempre, sin ningun error en consola.
  useEffect(() => {
    if (activeTab !== 'rates' || ratesRequested.current) return
    ratesRequested.current = true

    let cancelled = false
    setLoadingRates(true)
    setRatesError(null)
    getLaborRates()
      .then(res => {
        if (cancelled) return
        if (res.error) setRatesError(res.error)
        else {
          setLaborRates(res.rates)
          setCanEditRates(res.canEdit)
        }
      })
      .catch(() => { if (!cancelled) setRatesError('Could not load labor rates.') })
      .finally(() => { if (!cancelled) setLoadingRates(false) })
    return () => { cancelled = true }
  }, [activeTab])

  // Solo cuenta como cambio si el numero es valido y distinto del guardado.
  const dirtyRateCodes = laborRates
    .filter(r => {
      const draft = rateDrafts[r.code]
      if (draft === undefined) return false
      const n = Number(draft)
      return draft.trim() !== '' && Number.isFinite(n) && n >= 0 && n !== r.rate
    })
    .map(r => r.code)

  const handleSaveRates = async () => {
    if (dirtyRateCodes.length === 0) return
    setSavingRate(dirtyRateCodes[0])

    const failed: string[] = []
    for (const code of dirtyRateCodes) {
      const res = await setLaborRate({ code, rate: Number(rateDrafts[code]) })
      if (res.error) failed.push(`${code}: ${res.error}`)
    }

    // Se recarga desde el servidor en vez de asumir el resultado, para que
    // la columna Source refleje que ahora es tarifa propia y no la base.
    const refreshed = await getLaborRates()
    if (!refreshed.error) {
      setLaborRates(refreshed.rates)
      setCanEditRates(refreshed.canEdit)
    }

    setSavingRate(null)

    if (failed.length > 0) {
      showToast(failed[0], 'error')
      // Se conservan los borradores que fallaron para no perder lo escrito.
      setRateDrafts(prev => {
        const kept: Record<string, string> = {}
        for (const line of failed) {
          const code = line.split(':')[0]
          if (prev[code] !== undefined) kept[code] = prev[code]
        }
        return kept
      })
    } else {
      setRateDrafts({})
      showToast(`Updated ${dirtyRateCodes.length} rate${dirtyRateCodes.length > 1 ? 's' : ''}.`)
    }
  }

  const isOrgAdmin = teamData?.currentUserRole === 'owner' || teamData?.currentUserRole === 'admin'
  const isOwner = teamData?.currentUserRole === 'owner'

  // Every section planned for this page, with whether it actually renders anything.
  // Only `general` and `team` have a matching block in the content area below; the other
  // six were listed in the sidebar but showed an empty panel with no explanation when
  // clicked. They stay here so the roadmap is not lost — flip `built` to true once a
  // section has a real implementation and it reappears in the navigation.
  const allTabs = [
    { id: 'general', label: 'General', built: true },
    { id: 'team', label: 'Users & Permissions', built: true },
    { id: 'rates', label: 'Labor Rates', built: true },
    { id: 'profile', label: 'Profile', built: false },
    { id: 'company', label: 'Company / Organization', built: false },
    { id: 'branding', label: 'Branding', built: false },
    { id: 'preferences', label: 'Preferences', built: false },
    { id: 'integrations', label: 'Integrations', built: false },
    { id: 'security', label: 'Data & Security', built: false },
  ] as const

  const tabs = allTabs.filter(t => t.built)

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
      <aside className="w-56 border-r border-[var(--border)] bg-[var(--surface-1)] flex flex-col shrink-0 h-full p-4 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider block px-3 mb-2">Platform Settings</span>
          <nav className="space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  activeTab === tab.id
                    ? 'bg-[var(--surface-2)] text-[var(--accent-text)] font-bold border-l-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span>{tab.label}</span>
                {!isOrgAdmin && (
                  <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-mono">Read-Only</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-8 scrollbar-thin max-w-4xl font-sans">

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">General Workspace Settings</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Configure global application defaults and operational metadata.</p>
            </div>
            {/* The workspace name used to sit in an input with no save button, and the
                field below it showed a hardcoded "Production (US-East)" that came from
                nowhere. Now the name saves, and the invented field is gone. */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-xl space-y-4 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="workspace-name" className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">
                  Workspace Name
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!isOrgAdmin || isSavingName}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                />
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {isOrgAdmin
                    ? 'This is the name your team sees across the application.'
                    : 'Only owners and admins can change the workspace name.'}
                </p>
              </div>

              {isOrgAdmin && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveWorkspaceName}
                    disabled={isSavingName || !workspaceName.trim() || workspaceName.trim() === teamData?.organizationName}
                    className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    {isSavingName ? 'Saving…' : 'Save Changes'}
                  </button>
                  {workspaceName.trim() !== teamData?.organizationName && (
                    <button
                      type="button"
                      onClick={() => setWorkspaceName(teamData?.organizationName || '')}
                      disabled={isSavingName}
                      className="px-3.5 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Discard
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Labor Rates Tab */}
        {activeTab === 'rates' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Labor Rates</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                What the crew charges for work on infrastructure that already exists. Reusing a manhole
                buys no material, but it still costs labor.
              </p>
            </div>

            {/* Las tarifas base las sembro el sistema como punto de partida.
                Advertirlo es obligatorio: no son precios de mercado verificados
                y cotizar con ellas sin revisar produce numeros equivocados. */}
            <div className="bg-[var(--surface-1)] border-l-2 border-l-[var(--accent)] border border-[var(--border)] p-4 rounded-xl">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                <span className="font-bold text-[var(--text-primary)]">Values marked &ldquo;System default&rdquo; are not verified prices.</span>{' '}
                They are a starting point so the math works. Replace them with your real costs
                before quoting a client.
              </p>
            </div>

            {loadingRates ? (
              <p className="text-xs text-[var(--text-tertiary)]">Loading rates…</p>
            ) : ratesError ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p className="text-xs text-[var(--danger)] font-semibold">{ratesError}</p>
              </div>
            ) : (
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                        <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Code</th>
                        <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Work</th>
                        <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Applies to</th>
                        <th className="text-right px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Rate</th>
                        <th className="text-left px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider text-[var(--text-tertiary)]">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborRates.map(r => (
                        <tr key={r.code} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">{r.code}</td>
                          <td className="px-4 py-3 text-[var(--text-primary)]">{r.description}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            <span className="capitalize">{r.appliesToScope}</span>
                            {r.structureType && <span className="text-[var(--text-tertiary)]"> · {r.structureType.replace('_', ' ')}</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[var(--text-tertiary)]">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={rateDrafts[r.code] ?? String(r.rate)}
                                onChange={e => setRateDrafts(prev => ({ ...prev, [r.code]: e.target.value }))}
                                disabled={!canEditRates || savingRate !== null}
                                className="w-24 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-right text-[var(--text-primary)] font-semibold font-mono focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                              />
                              <span className="text-[10px] text-[var(--text-tertiary)] font-mono w-6">/{r.unit}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {r.isSystemDefault ? (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-text)]">System default</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Your rate</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {canEditRates && dirtyRateCodes.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
                    <button
                      type="button"
                      onClick={handleSaveRates}
                      disabled={savingRate !== null}
                      className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                    >
                      {savingRate ? 'Saving…' : `Save ${dirtyRateCodes.length} rate${dirtyRateCodes.length > 1 ? 's' : ''}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateDrafts({})}
                      disabled={savingRate !== null}
                      className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                )}

                {!canEditRates && (
                  <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
                    <p className="text-[11px] text-[var(--text-tertiary)]">Only owners and admins can change labor rates.</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
              Changing a rate affects labor lines created from now on. Lines already in a BOM keep
              the price they were created with — use Recalc Labor on the BOM to bring them up to date.
            </p>
          </div>
        )}

        {/* Users & Permissions Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Users & Team Permissions</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage team members, multi-tenant roles, and pending invitations{teamData?.organizationName ? ` for ${teamData.organizationName}` : ''}.</p>
              </div>

              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(true)}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Invite Team Member
                </button>
              )}
            </div>

            {!isOrgAdmin && !teamLoadError && !loadingTeam && (
              <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl text-xs font-medium flex items-center gap-2">
                <span>🔒</span>
                <span>Administrative controls (invites, role changes, and member removal) require Owner or Admin role.</span>
              </div>
            )}

            {/* Members Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Active Organization Members</h3>
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-[var(--text-secondary)]">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-bold">Name</th>
                      <th className="text-left px-4 py-2.5 font-bold">Email</th>
                      <th className="text-left px-4 py-2.5 font-bold">Role</th>
                      <th className="text-right px-4 py-2.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-sans">
                    {teamLoadError ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs">
                          <p className="text-[var(--danger)] font-bold mb-2">Couldn't load team members.</p>
                          <button onClick={loadTeamData} className="text-[var(--accent)] hover:underline font-semibold cursor-pointer">Try again</button>
                        </td>
                      </tr>
                    ) : loadingTeam ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">Loading team members...</td>
                      </tr>
                    ) : teamData?.members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-xs text-[var(--text-tertiary)]">No active members found.</td>
                      </tr>
                    ) : (
                      teamData?.members.map((member) => (
                        <tr key={member.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                          <td className="px-4 py-3 text-[var(--text-primary)] font-bold">
                            {member.fullName}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px]">{member.email}</td>
                          <td className="px-4 py-3">
                            {isOrgAdmin ? (
                              <select
                                value={member.role}
                                disabled={!isOwner && member.role === 'owner'}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
                              >
                                {isOwner && <option value="owner">Owner</option>}
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className="capitalize font-bold text-[var(--text-primary)]">{member.role}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOrgAdmin && (
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(member)}
                                className="text-xs text-[var(--danger)] hover:underline font-bold cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Invites Table */}
            {teamData?.invites && teamData.invites.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Pending Invitations</h3>
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-[var(--text-secondary)]">
                    <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-bold">Invited Email</th>
                        <th className="text-left px-4 py-2.5 font-bold">Assigned Role</th>
                        <th className="text-left px-4 py-2.5 font-bold">Status</th>
                        <th className="text-right px-4 py-2.5 font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] font-sans">
                      {teamData.invites.map((invite) => (
                        <tr key={invite.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-primary)] font-bold">{invite.email}</td>
                          <td className="px-4 py-3 capitalize font-semibold">{invite.role}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Invited — pending
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOrgAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="text-xs text-[var(--danger)] hover:underline font-bold cursor-pointer"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsInviteOpen(false)} />
          <form onSubmit={handleInviteSubmit} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Invite Team Member</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Send an invitation link to join {teamData?.organizationName}.</p>
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
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="editor">Editor (Can create and edit projects)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                  {isOwner && <option value="admin">Admin (Can manage users & settings)</option>}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button type="button" onClick={() => setIsInviteOpen(false)} disabled={isInviting} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="submit" disabled={isInviting} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5">
                {isInviting && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />}
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        title={`Remove ${memberToRemove?.fullName}?`}
        message={`This will revoke ${memberToRemove?.email}'s access to this organization's projects and resources.`}
        confirmText="Remover Miembro"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemoving}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  )
}
