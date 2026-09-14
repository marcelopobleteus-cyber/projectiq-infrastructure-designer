import { cache } from 'react'
import { createClient } from './server'

/**
 * Per-request memoised reads.
 *
 * A project page and its layout render in the same pass, and both used to call
 * `auth.getUser()` and then fetch the same `projects` row — plus the middleware
 * calls `getUser()` a third time before either of them runs. Each of those is a
 * separate network round-trip to Supabase, in series, before anything renders.
 *
 * React's `cache()` deduplicates by argument within a single request, so the
 * layout and the page now share one result instead of paying for it twice.
 * Nothing is cached ACROSS requests: every navigation still re-validates the
 * session and re-reads the project, so this changes cost, not freshness.
 */

export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getCachedProject = cache(async (projectId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  return data
})
