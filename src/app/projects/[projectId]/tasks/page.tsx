import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectTasksPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    notFound()
  }

  const columns = [
    {
      id: 'pending',
      title: 'Pending',
      color: 'border-slate-800 bg-slate-900/20 text-slate-400',
      tasks: [
        { id: 'TSK-101', title: 'Mount CAM-001 pole brackets', desc: 'Verify height clearances and bolts' },
        { id: 'TSK-103', title: 'Pull CAT6 cable to South Pole', desc: 'Measure distance, check conduit runs' },
      ],
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'border-blue-900/35 bg-blue-950/5 text-blue-400',
      tasks: [
        { id: 'TSK-102', title: 'Verify core switch PoE budget', desc: 'Inspect actual PoE draw of cameras' },
      ],
    },
    {
      id: 'blocked',
      title: 'Blocked',
      color: 'border-rose-900/35 bg-rose-950/5 text-rose-450',
      tasks: [
        { id: 'TSK-104', title: 'Connect MDF AC backup line', desc: 'Waiting for electrical hookup permit' },
      ],
    },
    {
      id: 'completed',
      title: 'Completed',
      color: 'border-emerald-900/30 bg-emerald-950/5 text-emerald-450',
      tasks: [
        { id: 'TSK-100', title: 'Initial site plan layout maps setup', desc: 'Configure coordinates and zoom' },
      ],
    },
  ]

  return (
    <div className="space-y-6 relative z-10 w-full max-w-7xl mx-auto px-6 py-4 font-sans text-slate-300 flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Installation Tasks</h2>
          <p className="text-xs text-slate-400 mt-1">Checklists and deployment status of physical site installations</p>
        </div>
        <button
          disabled
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed hover:bg-slate-900 flex items-center gap-1.5"
          title="Tasks creation is coming soon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-hidden min-h-0">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col h-full overflow-hidden">
            {/* Column Header */}
            <div className={`p-3 border rounded-t-xl font-bold text-xs uppercase tracking-wider flex justify-between items-center ${col.color} border-b-0 shrink-0`}>
              <span>{col.title}</span>
              <span className="font-mono text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-450">
                {col.tasks.length}
              </span>
            </div>

            {/* Column Body / Tasks list */}
            <div className="flex-1 overflow-y-auto border border-slate-850 border-t-0 p-3 bg-slate-900/10 rounded-b-xl space-y-2.5 scrollbar-thin">
              {col.tasks.map((task) => (
                <div key={task.id} className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-xl hover:border-slate-700 transition-colors space-y-2 group cursor-pointer shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/30 border border-indigo-900/20 px-1.5 py-0.25 rounded">
                      {task.id}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-slate-600 transition-colors" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors">{task.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{task.desc}</p>
                </div>
              ))}

              {col.tasks.length === 0 && (
                <div className="text-center py-8 text-[10px] text-slate-600 italic">
                  No tasks assigned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
