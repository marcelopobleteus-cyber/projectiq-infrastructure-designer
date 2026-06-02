import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/design-review/projects')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-6 relative overflow-hidden text-center">
      {/* Decorative blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-2xl space-y-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold text-2xl tracking-widest mb-4">
          NQ
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          NextQ <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">Infrastructure Designer</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mx-auto">
          High-performance spatial planner for CCTV and enterprise networks. Design your grid with power, fiber, and camera models.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] text-sm"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-semibold rounded-xl transition-all active:scale-[0.98] text-sm"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
