import { getTimeTrackingData } from './actions'
import TimeTrackingClient from './TimeTrackingClient'

// Server Component: same pattern as /settings — fetch on the server so the
// table renders with data already embedded in the first response.
export default async function TimeTrackingPage() {
  const data = await getTimeTrackingData()

  return <TimeTrackingClient {...data} />
}
