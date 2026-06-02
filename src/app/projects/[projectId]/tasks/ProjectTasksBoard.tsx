'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createFieldTask,
  updateFieldTask,
  deleteFieldTask,
  getFieldTasksWithCamera
} from '../../actions-sprint2'

interface Profile {
  id: string
  full_name: string | null
}

interface TaskWithCamera {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string | null
  camera: {
    camera_id_tag: string
    camera_id: string
  } | null
}

interface ProjectTasksBoardProps {
  projectId: string
  initialTasks: TaskWithCamera[]
  profiles: Profile[]
}

export default function ProjectTasksBoard({
  projectId,
  initialTasks,
  profiles
}: ProjectTasksBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithCamera[]>(initialTasks)
  const [isPending, setIsPending] = useState(false)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithCamera | null>(null)

  // Add form fields
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStatus, setNewStatus] = useState<'pending' | 'in_progress' | 'blocked' | 'completed'>('pending')

  // Edit form fields
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState<'pending' | 'in_progress' | 'blocked' | 'completed'>('pending')
  const [editAssignedTo, setEditAssignedTo] = useState<string>('')
  const [editDueDate, setEditDueDate] = useState<string>('')

  // Helper to refresh tasks list from database
  const refreshTasksList = async () => {
    try {
      const updated = await getFieldTasksWithCamera(projectId)
      setTasks(updated as TaskWithCamera[])
    } catch (err) {
      console.error('Error refreshing tasks list:', err)
    }
  }

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: 'pending' | 'in_progress' | 'blocked' | 'completed') => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))

    try {
      const res = await updateFieldTask({
        projectId,
        taskId,
        title: task.title, // keep current title, trigger prefix stripper will clean it if moving away from pending
        description: task.description,
        status: targetStatus,
        assignedTo: task.assigned_to,
        dueDate: task.due_date
      })

      if (res.error) {
        alert(res.error)
        refreshTasksList()
      } else {
        // Full refresh to fetch prefix cleans and sync updates from DB
        await refreshTasksList()
      }
    } catch (err) {
      console.error('Failed to move task:', err)
      refreshTasksList()
    }
  }

  // Create general task
  const handleCreateGeneralTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsPending(true)

    try {
      const res = await createFieldTask({
        projectId,
        title: newTitle,
        description: newDesc,
        status: newStatus
      })

      if (res.success) {
        setNewTitle('')
        setNewDesc('')
        setNewStatus('pending')
        setIsAddOpen(false)
        await refreshTasksList()
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error creating task:', err)
    } finally {
      setIsPending(false)
    }
  }

  // Edit task save
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !editTitle.trim()) return
    setIsPending(true)

    try {
      const res = await updateFieldTask({
        projectId,
        taskId: selectedTask.id,
        title: editTitle,
        description: editDesc,
        status: editStatus,
        assignedTo: editAssignedTo || null,
        dueDate: editDueDate || null
      })

      if (res.success) {
        setIsEditOpen(false)
        setSelectedTask(null)
        await refreshTasksList()
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error updating task:', err)
    } finally {
      setIsPending(false)
    }
  }

  // Delete field task
  const handleDeleteTask = async () => {
    if (!selectedTask) return
    if (!confirm('Are you sure you want to delete this task?')) return
    setIsPending(true)

    try {
      const res = await deleteFieldTask({
        projectId,
        taskId: selectedTask.id
      })

      if (res.success) {
        setIsEditOpen(false)
        setSelectedTask(null)
        await refreshTasksList()
      } else if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error('Error deleting task:', err)
    } finally {
      setIsPending(false)
    }
  }

  const openEditModal = (task: TaskWithCamera) => {
    setSelectedTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditStatus(task.status)
    setEditAssignedTo(task.assigned_to || '')
    setEditDueDate(task.due_date ? task.due_date.substring(0, 10) : '')
    setIsEditOpen(true)
  }

  // Helper to resolve tag details for advanced status prefix tags
  const getParsedTitleDetails = (title: string) => {
    if (title.startsWith('[Failed QA]')) {
      return { prefix: 'Failed QA', cleanTitle: title.replace(/^\[Failed QA\]\s*/, ''), color: 'bg-red-500/10 text-red-400 border border-red-500/20' }
    }
    if (title.startsWith('[Needs Rework]')) {
      return { prefix: 'Needs Rework', cleanTitle: title.replace(/^\[Needs Rework\]\s*/, ''), color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' }
    }
    if (title.startsWith('[Cancelled]')) {
      return { prefix: 'Cancelled', cleanTitle: title.replace(/^\[Cancelled\]\s*/, ''), color: 'bg-slate-800 text-slate-400 border border-slate-700/50' }
    }
    return { prefix: null, cleanTitle: title, color: '' }
  }

  const columns = [
    {
      id: 'pending' as const,
      title: 'Pending',
      color: 'border-slate-800 bg-slate-900/40 text-slate-400',
    },
    {
      id: 'in_progress' as const,
      title: 'In Progress',
      color: 'border-blue-950 bg-blue-950/10 text-blue-400',
    },
    {
      id: 'blocked' as const,
      title: 'Blocked',
      color: 'border-rose-950 bg-rose-950/10 text-rose-400',
    },
    {
      id: 'completed' as const,
      title: 'Completed',
      color: 'border-emerald-950 bg-emerald-950/10 text-emerald-400',
    },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full max-w-full px-8 py-4 font-sans text-slate-300 flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Installation Tasks</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-indigo-400 font-bold">
              Sprint 5.2.1
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Bidirectional synchronization with CCTV Camera checklists</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Density Toggles */}
          <div className="flex items-center bg-slate-950 border border-slate-850 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                density === 'comfortable'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                density === 'compact'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Compact
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-600 active:scale-97 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-900/10 transition-all cursor-pointer whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add General Task
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-hidden min-h-0">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id)
          return (
            <div
              key={col.id}
              className="flex flex-col h-full overflow-hidden"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={`p-3 border rounded-t-xl font-bold text-xs uppercase tracking-wider flex justify-between items-center ${col.color} border-b-0 shrink-0`}>
                <span>{col.title}</span>
                <span className="font-mono text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Body / Tasks list */}
              <div className="flex-1 overflow-y-auto border border-slate-850 border-t-0 p-3 bg-slate-950/10 rounded-b-xl space-y-2.5 scrollbar-thin min-h-[250px]">
                {colTasks.map(task => {
                  const { prefix, cleanTitle, color: prefixColor } = getParsedTitleDetails(task.title)
                  const assigneeName = profiles.find(p => p.id === task.assigned_to)?.full_name || 'Unassigned'
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onClick={() => openEditModal(task)}
                      className={`bg-slate-900 border transition-all group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:translate-y-[-1px] ${
                        density === 'compact'
                          ? 'p-2 rounded-lg border-slate-850/50 space-y-1.5'
                          : 'p-3.5 rounded-xl border-slate-850/80 space-y-2.5'
                      } hover:border-slate-700`}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {task.camera ? (
                            <Link
                              href={`/projects/${projectId}/maps?camera=${task.camera.camera_id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-[9px] font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-tight shrink-0 transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                              {task.camera.camera_id_tag}
                            </Link>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded uppercase shrink-0">
                              Task
                            </span>
                          )}

                          {prefix && (
                            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded tracking-wide shrink-0 ${prefixColor}`}>
                              {prefix}
                            </span>
                          )}
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-850 group-hover:bg-indigo-500 transition-colors shrink-0 mt-1" />
                      </div>

                      <h4 className={`font-bold text-slate-200 group-hover:text-white transition-colors leading-snug ${
                        density === 'compact' ? 'text-[11px]' : 'text-xs'
                      }`}>
                        {cleanTitle}
                      </h4>

                      {task.description && (
                        <p className={`text-slate-500 leading-normal ${
                          density === 'compact' ? 'text-[9.5px] line-clamp-1' : 'text-[10px] line-clamp-2'
                        }`}>
                          {task.description}
                        </p>
                      )}

                      <div className={`flex justify-between items-center border-t border-slate-850/40 font-mono text-slate-500 ${
                        density === 'compact' ? 'pt-1.5 text-[8.5px]' : 'pt-2.5 text-[9.5px]'
                      }`}>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {assigneeName}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-slate-400 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                  {colTasks.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-slate-600 italic">
                      No tasks assigned
                    </div>
                  )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── MODAL: ADD GENERAL TASK ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-extrabold text-white text-sm">Add General Project Task</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white rounded bg-slate-950 hover:bg-slate-800 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateGeneralTask} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Describe the task..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter additional details..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-850 mt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newTitle.trim()}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-900 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-900/10"
                >
                  {isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT TASK ── */}
      {isEditOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm">Edit Task</h3>
                <span className="text-[9.5px] font-mono text-slate-500 bg-slate-950 border border-slate-800/80 px-1.5 py-0.25 rounded shrink-0">
                  {selectedTask.camera ? selectedTask.camera.camera_id_tag : 'General'}
                </span>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white rounded bg-slate-950 hover:bg-slate-800 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    disabled={!!selectedTask.camera}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {selectedTask.camera && (
                    <p className="text-[9px] text-slate-500 mt-1">Title is synced with camera checklist and cannot be edited from Kanban board.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned To</label>
                  <select
                    value={editAssignedTo}
                    onChange={e => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || 'Unnamed Profile'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex pt-4 border-t border-slate-850 mt-4 justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={isPending}
                  className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold rounded-xl text-xs"
                >
                  Delete Task
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !editTitle.trim()}
                    className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-900 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-900/10"
                  >
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
