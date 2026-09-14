/**
 * How a project reads wherever it is referenced outside its own page.
 *
 * Construction Foreman shows the job number next to the name — on the project
 * list and on every timecard entry — and the crews identify jobs by that number
 * before they read the name. Keeping one helper means the number appears the
 * same way in the desktop timecard, the field app and the project list, instead
 * of three slightly different formats.
 */
export function projectLabel(jobNumber: string | null | undefined, name: string): string {
  return jobNumber ? `${jobNumber} · ${name}` : name
}
