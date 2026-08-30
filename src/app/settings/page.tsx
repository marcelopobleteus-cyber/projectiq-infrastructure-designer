import { getOrganizationTeamData } from './actions'
import SettingsClient from './SettingsClient'

// Server Component: fetches the team/org data natively on the server before
// render, the same pattern already used by /projects (see ProjectGridClient).
// This guarantees the data is embedded in the initial HTML response instead of
// being fetched client-side via a Server Action call from useEffect, which is
// what caused the intermittent "Loading team members..." hang — confirmed via
// Vercel runtime logs showing some invocations never reaching the server at all.
export default async function GlobalSettingsPage() {
  const initialTeamData = await getOrganizationTeamData()

  return <SettingsClient initialTeamData={initialTeamData} />
}
