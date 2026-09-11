import UnderConstruction from '@/components/UnderConstruction'
import { getDiscipline, getSectionMeta } from '@/lib/disciplines'

export default function TowerBuildPage() {
  const d = getDiscipline('tower_build')!
  const section = getSectionMeta(d.sections[0])
  return <UnderConstruction icon={d.icon} title={d.title} subtitle={d.subtitle} sectionLabel={section.title} />
}
