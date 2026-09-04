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

  const refreshTasksList = async () => {
    try {
      const updated = await getFieldTasksWithCamera(projectId)
      setTasks(updated as TaskWithCamera[])
    } catch (err) {
      console.error('Error refreshing tasks list:', err)
    }
  }

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

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))

    try {
      const res = await updateFieldTask({
        projectId,
        taskId,
        title: task.title,
        description: task.description,
        status: targetStatus,
        assignedTo: task.assigned_to,
        dueDate: task.due_date
      })

      if (res.error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t))
        alert(res.error)
      } else {
        await refreshTasksList()
      }
    } catch (err) {
      console.error('Error updating task status via drag:', err)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleCreateTask = async (e: React.FormEvent) => {
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
        setIsAddOpen(false)
        setNewTitle('')
        setNewDesc('')
        setNewStatus('pending')
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

  const handleUpdateTask = async (e: React.FormEvent) => {
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

  const getParsedTitleDetails = (title: string) => {
    if (title.startsWith('[Failed QA]')) {
      return { prefix: 'Failed QA', cleanTitle: title.replace(/^\[Failed QA\]\s*/, ''), color: 'bg-red-50 text-[var(--danger)] border border-red-200' }
    }
    if (title.startsWith('[Needs Rework]')) {
      return { prefix: 'Needs Rework', cleanTitle: title.replace(/^\[Needs Rework\]\s*/, ''), color: 'bg-[var(--warn-soft)] text-[var(--warn)] border border-amber-200' }
    }
    if (title.startsWith('[Cancelled]')) {
      return { prefix: 'Cancelled', cleanTitle: title.replace(/^\[Cancelled\]\s*/, ''), color: 'bg-[var(--surface-2)] text-[var(--text-tertiary)] border border-[var(--border)]' }
    }
    return { prefix: null, cleanTitle: title, color: '' }
  }

  const columns = [
    {
      id: 'pending' as const,
      title: 'Pending',
      color: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]',
    },
    {
      id: 'in_progress' as const,
      title: 'In Progress',
      color: 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]',
    },
    {
      id: 'blocked' as const,
      title: 'Blocked',
      color: 'border-red-200 bg-red-50 text-[var(--danger)]',
    },
    {
      id: 'completed' as const,
      title: 'Completed',
      color: 'border-emerald-200 bg-[var(--success-soft)] text-[var(--success)]',
    },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full max-w-full px-6 py-4 font-sans text-[var(--text-primary)] bg-[var(--bg)] flex-1 flex flex-col overflow-hidden min-h-full">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <span>Work Orders & Field Tasks</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Bidirectional synchronization with CCTV Camera checklists</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Density Toggles */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--border)] p-1 rounded-xl shrink-0">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                density === 'comfortable'
                  ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                density === 'compact'
                  ? 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Compact
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id)

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
              className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden shadow-xs"
            >
              {/* Column Header */}
              <div className={`p-3 border-b flex items-center justify-between ${col.color}`}>
                <span className="text-xs font-extrabold uppercase tracking-wider">{col.title}</span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-[var(--surface-1)] border border-[var(--border)]">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text-tertiary)] text-xs font-mono">
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map(task => {
                    const parsed = getParsedTitleDetails(task.title)
                    const assignedProfile = profiles.find(p => p.id === task.assigned_to)

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onClick={() => openEditModal(task)}
                        className={`p-3 bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-lg shadow-xs cursor-grab active:cursor-grabbing transition-all hover:bg-[var(--surface-hover)] ${
                          density === 'compact' ? 'py-2 px-2.5' : 'p-3'
                        }`}
                      >
                        <div className="space-y-1.5">
                          {parsed.prefix && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${parsed.color}`}>
                              {parsed.prefix}
                            </span>
                          )}

                          <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                            {parsed.cleanTitle}
                          </h4>

                          {task.description && density !== 'compact' && (
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-medium">
                              {task.description}
                            </p>
                          )}

                          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono">
                            {task.camera ? (
                              <span className="text-[var(--accent-text)] font-bold">
                                {task.camera.camera_id_tag}
                              </span>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">General Task</span>
                            )}

                            {assignedProfile && (
                              <span className="text-[var(--text-secondary)] font-sans font-semibold">
                                {assignedProfile.full_name || 'Assigned'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setIsAddOpen(false)} />
          <form onSubmit={handleCreateTask} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Create Field Task</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Add installation ticket or manual maintenance check.</p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Task Title</label>
                <input required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Verify pole bracket grounding" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Instructions for technician..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-20 resize-none font-medium" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-semibold">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-1)] backdrop-blur-xs" onClick={() => setIsEditOpen(false)} />
          <form onSubmit={handleUpdateTask} className="relative bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black uppercase text-[var(--accent-text)] tracking-wider">Edit Task Details</h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">Task ID: {selectedTask.id.substring(0, 8)}</p>
              </div>
              <button type="button" onClick={handleDeleteTask} className="text-xs font-bold text-[var(--danger)] hover:underline cursor-pointer">
                Delete
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Task Title</label>
                <input required type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-semibold" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-20 resize-none font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-semibold">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Assignee</label>
                  <select value={editAssignedTo} onChange={e => setEditAssignedTo(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-semibold">
                    <option value="">Unassigned</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.id.substring(0, 8)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
