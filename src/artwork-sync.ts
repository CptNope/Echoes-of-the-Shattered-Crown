import { animationArtId } from "./character-art";
import { nativeSources } from "./studio-assets";
import { gameContent } from "./studio-content";
import type { LevelProject, ProjectEdit } from "./studio-project";
import type { NativeSprite } from "./studio-native-sprites";
import type { PixelClip } from "./studio-pixels";
import type { JobId, Job } from "./data";
export type ArtworkProject = Pick<
  LevelProject,
  "nativeSprite" | "nativeSprites" | "pixels" | "rules"
>;
export type ActorArtwork =
  | { kind: "native"; artId: JobId; source: NativeSprite }
  | { kind: "indexed"; artId: JobId; source: PixelClip }
  | { kind: "class"; artId: JobId };
/** Shared precedence for renderer, source inspection and edit routing. */
export function resolveActorArtwork(
  actor: { id: string; job: JobId },
  project: ArtworkProject,
): ActorArtwork {
  const artId = animationArtId(actor.job, project.rules?.jobs);
  const native = nativeSources(project).find(
    (s) => s.enabled && s.actorId === actor.id,
  );
  if (native) return { kind: "native", artId, source: native };
  if (project.pixels?.enabled && project.pixels.actorId === actor.id)
    return { kind: "indexed", artId, source: project.pixels };
  return { kind: "class", artId };
}
export function projectArtwork(project: LevelProject) {
  const actors =
    project.content?.actors ?? gameContent(project.encounter).actors;
  return actors.map((actor) => ({
    actor,
    art: resolveActorArtwork(actor, project),
  }));
}
/** Disable overrides reversibly, preserving every source pixel and frame duration. */
export function useClassArtwork(
  project: LevelProject,
  ids: readonly string[],
): ProjectEdit[] {
  const targets = new Set(ids),
    edits: ProjectEdit[] = [];
  const sheets = nativeSources(project);
  if (sheets.some((s) => s.enabled && targets.has(s.actorId)))
    edits.push({
      type: "native-library",
      sprites: sheets.map((s) =>
        targets.has(s.actorId) ? { ...s, enabled: false } : s,
      ),
    });
  if (project.pixels?.enabled && targets.has(project.pixels.actorId))
    edits.push({ type: "pixels", clip: { ...project.pixels, enabled: false } });
  return edits;
}
/** Texture ownership follows the resolved artwork ID, never the gameplay base ID. */
export function cachedClassArtwork<T>(
  cache: Map<JobId, T>,
  job: JobId,
  catalog: Record<JobId, Job> | undefined,
  create: () => T,
): T {
  const id = animationArtId(job, catalog),
    existing = cache.get(id);
  if (existing !== undefined) return existing;
  const source = create();
  cache.set(id, source);
  return source;
}
