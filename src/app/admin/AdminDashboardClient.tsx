'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  PlatformOverviewData,
  PlatformOrganizationItem,
  PlatformUserItem,
  PlatformActivityItem,
  toggleUserPlatformAdmin,
  savePlatformSetting,
  createPlatformOrganization,
  deletePlatformOrganization,
  getPlatformOverviewData,
} from './actions'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface AdminDashboardClientProps {
  initialData: PlatformOverviewData
}

export default function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [data, setData] = useState<PlatformOverviewData>(initialData)
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'users' | 'audit' | 'settings'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Refresh data handler
  const refreshData = async () => {
    try {
      const refreshed = await getPlatformOverviewData()
      setData(refreshed)
    } catch (e) {
      console.error('Failed to refresh admin data:', e)
    }
  }

  // Modal: Create Tenant
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgOwnerEmail, setNewOrgOwnerEmail] = useState('')
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setIsCreatingOrg(true)
    try {
      const res = await createPlatformOrganization(newOrgName, newOrgOwnerEmail)
      if (res.error) {
        showToast(res.error, 'error')
      } else {
        showToast(`Tenant "${newOrgName}" created successfully!`, 'success')
        setIsCreateOrgOpen(false)
        setNewOrgName('')
        setNewOrgOwnerEmail('')
        await refreshData()
      }
    } catch (err: any) {
      showToast(err?.message || 'Error creating organization', 'error')
    } finally {
      setIsCreatingOrg(false)
    }
  }

  // Modal: Delete Tenant Confirmation
  const [orgToDelete, setOrgToDelete] = useState<PlatformOrganizationItem | null>(null)
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)

  const handleConfirmDeleteOrg = async () => {
    if (!orgToDelete) return
    setIsDeletingOrg(true)
    try {
      const res = await deletePlatformOrganization(orgToDelete.id)
      if (res.error) {
        showToast(res.error, 'error')
      } else {
        showToast(`Tenant "${orgToDelete.name}" deleted.`, 'info')
        setOrgToDelete(null)
        await refreshData()
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting organization', 'error')
    } finally {
      setIsDeletingOrg(false)
    }
  }

  // Modal: Toggle Platform Admin Role Confirmation
  const [userToToggleAdmin, setUserToToggleAdmin] = useState<{ user: PlatformUserItem; newStatus: boolean } | null>(null)
  const [isTogglingAdmin, setIsTogglingAdmin] = useState(false)

  const handleConfirmToggleAdmin = async () => {
    if (!userToToggleAdmin) return
    setIsTogglingAdmin(true)
    try {
      const res = await toggleUserPlatformAdmin(userToToggleAdmin.user.id, userToToggleAdmin.newStatus)
      if (res.error) {
        showToast(res.error, 'error')
      } else {
        showToast(
          userToToggleAdmin.newStatus
            ? `Superadmin privileges granted to ${userToToggleAdmin.user.fullName}.`
            : `Superadmin privileges revoked from ${userToToggleAdmin.user.fullName}.`,
          'success'
        )
        setUserToToggleAdmin(null)
        await refreshData()
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating admin status', 'error')
    } finally {
      setIsTogglingAdmin(false)
    }
  }

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState(data.platformSettings)
  const [isSavingSetting, setIsSavingSetting] = useState(false)

  const handleSaveSetting = async (key: string, value: any) => {
    setIsSavingSetting(true)
    try {
      const res = await savePlatformSetting(key, value)
      if (res.error) {
        showToast(res.error, 'error')
      } else {
        showToast(`Platform setting "${key}" updated!`, 'success')
        await refreshData()
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving setting', 'error')
    } finally {
      setIsSavingSetting(false)
    }
  }

  // Audit filter state
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all')

  // Metadata Inspector Modal
  const [inspectMetadata, setInspectMetadata] = useState<{ title: string; json: any } | null>(null)

  // Filtered lists
  const filteredOrgs = data.organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.owners.some((own) => own.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || own.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredUsers = data.users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organizations.some((o) => o.orgName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredActivity = data.recentActivity.filter((a) => {
    const matchSearch =
      a.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.projectName && a.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.entityType.toLowerCase().includes(searchQuery.toLowerCase())

    const matchAction = auditFilterAction === 'all' || a.action.startsWith(auditFilterAction)
    return matchSearch && matchAction
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text-primary)] font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-primary)] px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : toast.type === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-blue-500'
            }`}
          />
          {toast.message}
        </div>
      )}

      {/* Top Banner / System Status Header */}
      <header className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md font-black text-base">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-[var(--text-primary)]">Platform Administration</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Superadmin
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Global SaaS multi-tenant governance, system health, and access control.
            </p>
          </div>
        </div>

        {/* Global Stats & Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[var(--text-secondary)]">Database & RLS:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Optimal</span>
          </div>

          {data.platformSettings.maintenanceMode.enabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Maintenance Mode Active
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
              {(data.callerName || 'A').substring(0, 1)}
            </div>
            <span className="font-semibold">{data.callerEmail}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="px-6 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-between gap-4 shrink-0 overflow-x-auto scrollbar-none">
        <nav className="flex gap-1 py-2">
          {[
            {
              id: 'overview',
              label: 'Overview & KPIs',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
              ),
            },
            {
              id: 'tenants',
              label: `Organizations (${data.organizations.length})`,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              ),
            },
            {
              id: 'users',
              label: `Global Users (${data.users.length})`,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ),
            },
            {
              id: 'audit',
              label: `Cross-Tenant Audit (${data.recentActivity.length})`,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              ),
            },
            {
              id: 'settings',
              label: 'Platform Config',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Global Search Input */}
        <div className="flex items-center gap-2.5 py-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search across platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium w-48 sm:w-64 transition-all"
            />
            <svg
              className="absolute left-2.5 top-2 text-[var(--text-tertiary)] pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <button
            onClick={refreshData}
            title="Refresh Platform Data"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & KPIS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-[var(--border-strong)] transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Tenant Workspaces</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  </div>
                </div>
                <div className="text-3xl font-black mt-2 text-[var(--text-primary)]">{data.metrics.totalOrganizations}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600 font-bold">100% active</span> multi-tenant isolation
                </div>
              </div>

              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-[var(--border-strong)] transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Global User Accounts</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                </div>
                <div className="text-3xl font-black mt-2 text-[var(--text-primary)]">{data.metrics.totalUsers}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-indigo-600 font-bold">{data.users.filter((u) => u.isPlatformAdmin).length} Superadmins</span>
                </div>
              </div>

              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-[var(--border-strong)] transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Total Projects</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                </div>
                <div className="text-3xl font-black mt-2 text-[var(--text-primary)]">{data.metrics.totalProjects}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600 font-bold">{data.metrics.activeProjects} active designs</span>
                </div>
              </div>

              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 shadow-xs relative overflow-hidden group hover:border-[var(--border-strong)] transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">24h System Events</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                </div>
                <div className="text-3xl font-black mt-2 text-[var(--text-primary)]">{data.metrics.activityCount24h}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-medium">
                  Audit triggers active across all tables
                </div>
              </div>
            </div>

            {/* Quick Actions & Platform Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Recent Cross-Tenant Audit Log Preview */}
              <div className="lg:col-span-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-wider">Live System Activity Stream</h2>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Real-time audit log captured across all organizations.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {data.recentActivity.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="py-3 flex items-start justify-between gap-4 group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {activity.action}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{activity.actorName}</span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">in</span>
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">{activity.organizationName}</span>
                        </div>
                        {activity.projectName && (
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Project: <span className="font-bold text-[var(--text-primary)]">{activity.projectName}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)] shrink-0">
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Col: Platform Controls & Health */}
              <div className="space-y-6">
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-xs">
                  <h2 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-wider">Quick Platform Actions</h2>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsCreateOrgOpen(true)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        <span>Provision New Tenant Organization</span>
                      </div>
                      <span className="text-[var(--text-tertiary)]">+</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Manage Superadmin Roles</span>
                      </div>
                      <span className="text-[var(--text-tertiary)]">&rarr;</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Configure Maintenance & Banners</span>
                      </div>
                      <span className="text-[var(--text-tertiary)]">&rarr;</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-3 shadow-xs">
                  <h2 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-wider">Architecture State</h2>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span className="text-[var(--text-secondary)]">Database Version</span>
                      <span className="font-mono font-bold">PostgreSQL 15+ / Supabase</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span className="text-[var(--text-secondary)]">Active Migration</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">020_platform_admin</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]">
                      <span className="text-[var(--text-secondary)]">Multi-Tenant Isolation</span>
                      <span className="font-mono font-bold text-emerald-600">Row Level Security (RLS)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--text-secondary)]">Hardware Devices Tracked</span>
                      <span className="font-mono font-bold">{data.metrics.totalDevices} units</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TENANT ORGANIZATIONS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--text-primary)]">SaaS Tenant Workspaces</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  Manage all isolated client organizations, seat counts, and project limits.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOrgOpen(true)}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-2 self-start"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Organization
              </button>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-[var(--text-secondary)]">
                <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">Organization Name</th>
                    <th className="text-left px-5 py-3 font-bold">Primary Owners / Admins</th>
                    <th className="text-center px-5 py-3 font-bold">Members</th>
                    <th className="text-center px-5 py-3 font-bold">Projects</th>
                    <th className="text-left px-5 py-3 font-bold">Created Date</th>
                    <th className="text-right px-5 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-sans">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-xs text-[var(--text-tertiary)]">
                        No organizations found matching "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => (
                      <tr key={org.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs">
                              {org.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-xs">{org.name}</p>
                              <p className="font-mono text-[10px] text-[var(--text-tertiary)]">{org.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {org.owners.length === 0 ? (
                            <span className="text-[11px] text-[var(--text-tertiary)] italic">No assigned owner</span>
                          ) : (
                            <div className="space-y-0.5">
                              {org.owners.map((owner, idx) => (
                                <p key={idx} className="font-medium text-[var(--text-primary)] text-[11px]">
                                  {owner.fullName} <span className="text-[var(--text-tertiary)]">({owner.email})</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]">
                            {org.membersCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {org.projectsCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[11px] font-mono text-[var(--text-tertiary)]">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setOrgToDelete(org)}
                            className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GLOBAL USERS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-black text-[var(--text-primary)]">Global Platform User Directory</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Inspect registered users across all tenants and grant/revoke Platform Superadmin privileges.
              </p>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-[var(--text-secondary)]">
                <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">User</th>
                    <th className="text-left px-5 py-3 font-bold">Email</th>
                    <th className="text-left px-5 py-3 font-bold">Tenant Memberships</th>
                    <th className="text-center px-5 py-3 font-bold">Platform Superadmin</th>
                    <th className="text-right px-5 py-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs text-[var(--text-tertiary)]">
                        No users found matching "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                              {u.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-xs">{u.fullName}</p>
                              <p className="font-mono text-[10px] text-[var(--text-tertiary)]">{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-xs text-[var(--text-primary)]">
                          {u.email}
                        </td>
                        <td className="px-5 py-4">
                          {u.organizations.length === 0 ? (
                            <span className="text-[11px] text-[var(--text-tertiary)]">No organization assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {u.organizations.map((orgAff, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
                                >
                                  {orgAff.orgName}
                                  <span className="text-[var(--text-tertiary)] uppercase font-mono">({orgAff.role})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {u.isPlatformAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              Platform Superadmin
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-tertiary)] font-medium">Standard User</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setUserToToggleAdmin({ user: u, newStatus: !u.isPlatformAdmin })}
                            className={`text-xs font-bold hover:underline cursor-pointer ${
                              u.isPlatformAdmin ? 'text-amber-600 hover:text-amber-700' : 'text-indigo-600 hover:text-indigo-700'
                            }`}
                          >
                            {u.isPlatformAdmin ? 'Revoke Superadmin' : 'Grant Superadmin'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CROSS-TENANT AUDIT LOG */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--text-primary)]">System-Wide Activity & Audit Trail</h2>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  Complete immutable ledger of project modifications, team mutations, and system changes.
                </p>
              </div>

              {/* Action Filter dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Action Filter:</label>
                <select
                  value={auditFilterAction}
                  onChange={(e) => setAuditFilterAction(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="all">All Actions</option>
                  <option value="insert">Insert</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="member">Member Actions</option>
                  <option value="platform_admin">Platform Admin Actions</option>
                </select>
              </div>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-[var(--text-secondary)]">
                <thead className="bg-[var(--surface-2)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] font-sans">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">Timestamp</th>
                    <th className="text-left px-5 py-3 font-bold">Action</th>
                    <th className="text-left px-5 py-3 font-bold">Actor</th>
                    <th className="text-left px-5 py-3 font-bold">Tenant / Workspace</th>
                    <th className="text-left px-5 py-3 font-bold">Target Entity</th>
                    <th className="text-right px-5 py-3 font-bold">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-sans">
                  {filteredActivity.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-xs text-[var(--text-tertiary)]">
                        No activity records found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredActivity.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[var(--text-primary)] text-xs">{log.actorName}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{log.actorEmail}</p>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--text-primary)]">
                          {log.organizationName}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                              {log.entityType}
                            </span>
                            {log.projectName && (
                              <p className="text-[11px] text-[var(--text-primary)] font-medium">
                                Proj: {log.projectName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {log.metadata ? (
                            <button
                              onClick={() => setInspectMetadata({ title: `Event Payload: ${log.action}`, json: log.metadata })}
                              className="text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer"
                            >
                              Inspect JSON
                            </button>
                          ) : (
                            <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PLATFORM CONFIGURATION & GOVERNANCE */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-base font-black text-[var(--text-primary)]">Platform Governance & Feature Flags</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Control system maintenance mode, announcement broadcasts, and default tenant quotas.
              </p>
            </div>

            {/* Maintenance Mode Card */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-wider">Maintenance Mode</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Locks designer modifications across all client workspaces and presents a maintenance notice.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.maintenanceMode.enabled}
                    onChange={(e) => {
                      const updated = { ...settingsForm.maintenanceMode, enabled: e.target.checked }
                      setSettingsForm({ ...settingsForm, maintenanceMode: updated })
                      handleSaveSetting('maintenance_mode', updated)
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                </label>
              </div>

              {settingsForm.maintenanceMode.enabled && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Maintenance Message</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settingsForm.maintenanceMode.message}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          maintenanceMode: { ...settingsForm.maintenanceMode, message: e.target.value },
                        })
                      }
                      className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                    />
                    <button
                      onClick={() => handleSaveSetting('maintenance_mode', settingsForm.maintenanceMode)}
                      disabled={isSavingSetting}
                      className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Save Notice
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Global System Announcement Banner Card */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-[var(--text-primary)] tracking-wider">Global System Announcement Banner</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Display a persistent top banner message across all active user sessions.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.systemAnnouncement.enabled}
                    onChange={(e) => {
                      const updated = { ...settingsForm.systemAnnouncement, enabled: e.target.checked }
                      setSettingsForm({ ...settingsForm, systemAnnouncement: updated })
                      handleSaveSetting('system_announcement', updated)
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                </label>
              </div>

              {settingsForm.systemAnnouncement.enabled && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Announcement Text</label>
                      <input
                        type="text"
                        value={settingsForm.systemAnnouncement.message}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            systemAnnouncement: { ...settingsForm.systemAnnouncement, message: e.target.value },
                          })
                        }
                        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Banner Type</label>
                      <select
                        value={settingsForm.systemAnnouncement.type}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            systemAnnouncement: { ...settingsForm.systemAnnouncement, type: e.target.value as any },
                          })
                        }
                        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="critical">Critical (Rose)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveSetting('system_announcement', settingsForm.systemAnnouncement)}
                    disabled={isSavingSetting}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition cursor-pointer self-start"
                  >
                    Update Announcement
                  </button>
                </div>
              )}
            </div>

            {/* Registration & Quotas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider">Self-Serve Signups</h3>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Allow new users to self-register via /register.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.allowSignups.enabled}
                      onChange={(e) => {
                        const updated = { enabled: e.target.checked }
                        setSettingsForm({ ...settingsForm, allowSignups: updated })
                        handleSaveSetting('allow_signups', updated)
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                  </label>
                </div>
              </div>

              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-3 shadow-xs">
                <div>
                  <h3 className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider">Default Project Limit</h3>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Maximum projects allowed per new organization.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={settingsForm.defaultProjectLimit.limit}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        defaultProjectLimit: { limit: parseInt(e.target.value, 10) || 50 },
                      })
                    }
                    className="w-24 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none font-bold"
                  />
                  <button
                    onClick={() => handleSaveSetting('default_project_limit', settingsForm.defaultProjectLimit)}
                    disabled={isSavingSetting}
                    className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Set Limit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Create Organization */}
      {isCreateOrgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCreateOrgOpen(false)} />
          <form onSubmit={handleCreateOrg} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Provision Tenant Organization</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Create a brand-new multi-tenant workspace.</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Telecom Group"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Primary Owner Email (Optional)</label>
                <input
                  type="email"
                  placeholder="owner@company.com"
                  value={newOrgOwnerEmail}
                  onChange={(e) => setNewOrgOwnerEmail(e.target.value)}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsCreateOrgOpen(false)}
                disabled={isCreatingOrg}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOrg}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isCreatingOrg && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />}
                Create Tenant
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Metadata JSON Inspector */}
      {inspectMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setInspectMetadata(null)} />
          <div className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">{inspectMetadata.title}</h3>
              <button onClick={() => setInspectMetadata(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs font-bold">
                ✕
              </button>
            </div>
            <pre className="bg-[var(--surface-2)] p-4 rounded-xl text-xs font-mono text-[var(--text-primary)] overflow-x-auto max-h-72 border border-[var(--border)]">
              {JSON.stringify(inspectMetadata.json, null, 2)}
            </pre>
            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setInspectMetadata(null)}
                className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal: Delete Organization */}
      <ConfirmModal
        isOpen={Boolean(orgToDelete)}
        title={`¿Eliminar Tenant "${orgToDelete?.name}"?`}
        message="Esta acción es irreversible y eliminará todos los proyectos, asignaciones y miembros pertenecientes a esta organización."
        confirmText="Eliminar Organización"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeletingOrg}
        onConfirm={handleConfirmDeleteOrg}
        onCancel={() => setOrgToDelete(null)}
      />

      {/* Confirm Modal: Toggle Platform Admin Status */}
      <ConfirmModal
        isOpen={Boolean(userToToggleAdmin)}
        title={
          userToToggleAdmin?.newStatus
            ? `¿Otorgar rol de Superadmin de Plataforma a ${userToToggleAdmin?.user.fullName}?`
            : `¿Revocar rol de Superadmin de Plataforma a ${userToToggleAdmin?.user.fullName}?`
        }
        message={
          userToToggleAdmin?.newStatus
            ? `El usuario ${userToToggleAdmin?.user.email} tendrá acceso completo para administrar todas las organizaciones, proyectos y registros de auditoría de toda la plataforma.`
            : `El usuario ${userToToggleAdmin?.user.email} perderá acceso al panel de administración general (/admin).`
        }
        confirmText={userToToggleAdmin?.newStatus ? 'Otorgar Superadmin' : 'Revocar Acceso'}
        cancelText="Cancelar"
        variant={userToToggleAdmin?.newStatus ? 'default' : 'danger'}
        isLoading={isTogglingAdmin}
        onConfirm={handleConfirmToggleAdmin}
        onCancel={() => setUserToToggleAdmin(null)}
      />
    </div>
  )
}
