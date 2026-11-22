import characterSources from "./character-sources.json";
import { jobs, baseJobId, type JobId, type Job } from "./data";
/** Stable artwork IDs, separate from project-scoped gameplay catalogs. */
export const CHARACTER_ART: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(jobs).map(([id, job]) => [id, job.name]),
  ),
  ...Object.fromEntries(characterSources.map((s) => [s.id, s.name])),
};
export function animationArtId(
  job: JobId,
  catalog?: Record<JobId, Job>,
): JobId {
  return Object.hasOwn(CHARACTER_ART, job) ? job : baseJobId(job, catalog);
}
