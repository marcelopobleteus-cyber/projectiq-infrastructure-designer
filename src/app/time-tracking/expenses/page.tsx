import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCachedUser } from '@/utils/supabase/cached'
import { BYPASS_AUTH } from '@/config/auth'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const user = await getCachedUser()
  if (!user && !BYPASS_AUTH) redirect('/login')

  const supabase = await createClient()

  const { data: memberRows } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user!.id)
    .limit(1)

  const orgId = memberRows?.[0]?.organization_id ?? null

  const [{ data: projects }, { data: org }] = await Promise.all([
    orgId
      ? supabase.from('projects').select('id, name').eq('organization_id', orgId).order('name')
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    orgId
      ? supabase.from('organizations').select('name').eq('id', orgId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <ExpensesClient
      projects={projects ?? []}
      organizationName={org?.name ?? 'Your organization'}
    />
  )
}
