import { jobs, baseJobId, type JobId, type Job } from "./data";
/** Stable artwork IDs, separate from project-scoped gameplay catalogs. */
export const CHARACTER_ART: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(jobs).map(([id, job]) => [id, job.name]),
  ),
  "custom-glass-ranger": "Glass Ranger / Tamsin",
  "custom-ash-cantor": "Ash Cantor / Orris",
};
export function animationArtId(
  job: JobId,
  catalog?: Record<JobId, Job>,
): JobId {
  return Object.hasOwn(CHARACTER_ART, job) ? job : baseJobId(job, catalog);
}
