import UnderConstruction from '@/components/UnderConstruction'
import { getDiscipline, getSectionMeta } from '@/lib/disciplines'

export default function TowerModificationsPage() {
  const d = getDiscipline('tower_modifications')!
  const section = getSectionMeta(d.sections[0])
  return <UnderConstruction icon={d.icon} title={d.title} subtitle={d.subtitle} sectionLabel={section.title} />
}
