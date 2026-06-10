'use server'

import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'

export type CoordinatePoint = Database['public']['Tables']['project_coordinate_points']['Row']

export async function getProjectCoordinatePoints(projectId: string): Promise<CoordinatePoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_coordinate_points')
    .select('*')
    .eq('project_id', projectId)
    .order('device_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch coordinate points: ${error.message}`)
  }
  return data
}
