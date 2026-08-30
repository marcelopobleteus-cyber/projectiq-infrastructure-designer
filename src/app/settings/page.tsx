'use client'

import React, { useState, useEffect } from 'react'
import {
  getOrganizationTeamData,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  revokeInvite,
  OrganizationTeamData,
  TeamMemberItem,
  PendingInviteItem,
} from './actions'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function GlobalSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'company' | 'branding' | 'team' | 'preferences' | 'integrations' | 'security'>('general')

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  
  // Real team data state
  const [teamData, setTeamData] = useState<OrganizationTeamData | null>(null)
  const [loadingTeam, setLoadingTeam] = useState(false)

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [isInviting, setIsInviting] = useState(false)

  // Member deletion state
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberItem | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load live organization team data
  const loadTeamData = async () => {
    setLoadingTeam(true)
    const data = await getOrganizationTeamData()
    setTeamData(data)
    setLoadingTeam(false)
  }

  useEffect(() => {
    loadTeamData()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    const res = await inviteTeamMember(inviteEmail, inviteRole)
    setIsInviting(false)

    if (res.error) {
      showToast(res.error, 'error')
    } else {
      showToast(`Invitation sent to ${inviteEmail}!`)
      setIsInviteOpen(false)
      setInviteEmail('')
      loadTeamData()
    }
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

  const isOrgAdmin = teamData?.currentUserRole === 'owner' || teamData?.currentUserRole === 'admin'
  const isOwner = teamData?.currentUserRole === 'owner'

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
                {(tab.id === 'company' || tab.id === 'branding' || tab.id === 'team') && !isOrgAdmin && (
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
            <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-xl space-y-4 shadow-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Workspace Title</label>
                <input type="text" defaultValue={teamData?.organizationName || 'NextQ Infrastructure Designer'} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] font-semibold" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Environment</label>
                <input type="text" readOnly defaultValue="Production (US-East)" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-tertiary)] font-mono" />
              </div>
            </div>
          </div>
        )}

        {/* Users & Permissions Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Users & Team Permissions</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Manage team members, multi-tenant roles, and pending invitations for {teamData?.organizationName}.</p>
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

            {!isOrgAdmin && (
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
                    {loadingTeam ? (
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
        title={`¿Remover a ${memberToRemove?.fullName}?`}
        message={`Esta acción revocará el acceso de ${memberToRemove?.email} a los proyectos y recursos de la organización.`}
        confirmText="Remover Miembro"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isRemoving}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  )
}
