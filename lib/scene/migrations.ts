import { createDefaultScene } from "./defaults";
import { SCENE_VERSION, sceneSchema, type Scene } from "./schema";

export type SceneMigration = (
  scene: Record<string, unknown>,
) => Record<string, unknown>;

export const SCENE_MIGRATIONS: Record<number, SceneMigration> = {};

export type MigrateResult = {
  scene: Scene;
  migrated: boolean;
  warning: string | null;
};

export function applyMigrations(
  input: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
  migrations: Record<number, SceneMigration>,
): { scene: Record<string, unknown>; migrated: boolean; complete: boolean } {
  let current = input;
  let migrated = false;
  for (let version = fromVersion; version < toVersion; version++) {
    const step = migrations[version];
    if (!step) return { scene: current, migrated, complete: false };
    current = step(current);
    migrated = true;
  }
  return { scene: current, migrated, complete: true };
}

export function migrateScene(input: unknown): MigrateResult {
  if (typeof input !== "object" || input === null) {
    return {
      scene: createDefaultScene(),
      migrated: false,
      warning: "Invalid scene data. Default settings were restored.",
    };
  }

  const data = input as Record<string, unknown>;
  const version = typeof data.version === "number" ? data.version : null;

  if (version === null) {
    return {
      scene: createDefaultScene(),
      migrated: false,
      warning: "Scene version is missing. Default settings were restored.",
    };
  }

  if (version > SCENE_VERSION) {
    return {
      scene: createDefaultScene(),
      migrated: false,
      warning: `Scene version ${version} is newer than this app supports. Default settings were restored.`,
    };
  }

  const { scene, migrated, complete } = applyMigrations(
    data,
    version,
    SCENE_VERSION,
    SCENE_MIGRATIONS,
  );

  if (!complete) {
    return {
      scene: createDefaultScene(),
      migrated: false,
      warning: `Scene version ${version} has no supported migration. Default settings were restored.`,
    };
  }

  const parsed = sceneSchema.safeParse(scene);
  if (!parsed.success) {
    return {
      scene: createDefaultScene(),
      migrated,
      warning: "Scene validation failed. Default settings were restored.",
    };
  }

  return { scene: parsed.data, migrated, warning: null };
}
