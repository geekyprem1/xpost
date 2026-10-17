import { describe, expect, it } from "vitest";
import { createDefaultScene } from "./defaults";
import { applyMigrations, migrateScene } from "./migrations";

describe("scene migrations", () => {
  it("current version ka valid scene waisa hi rehta hai", () => {
    const result = migrateScene(createDefaultScene());
    expect(result.warning).toBeNull();
    expect(result.migrated).toBe(false);
    expect(result.scene).toEqual(createDefaultScene());
  });

  it("v1 scene ko v2 mein migrate karta hai (empty layers)", () => {
    const current = createDefaultScene();
    const v1 = { ...current, version: 1 } as Record<string, unknown>;
    delete v1.layers;

    const result = migrateScene(v1);

    expect(result.warning).toBeNull();
    expect(result.migrated).toBe(true);
    expect(result.scene.version).toBe(2);
    expect(result.scene.layers).toEqual([]);
    expect(result.scene.background).toEqual(current.background);
    expect(result.scene.transform).toEqual(current.transform);
  });

  it("missing version pe defaults + warning milta hai", () => {
    const result = migrateScene({ canvas: {} });
    expect(result.warning).not.toBeNull();
    expect(result.migrated).toBe(false);
    expect(result.scene).toEqual(createDefaultScene());
  });

  it("corrupt input pe defaults milte hain", () => {
    expect(migrateScene("nope").scene).toEqual(createDefaultScene());
    expect(migrateScene(null).warning).not.toBeNull();
    expect(migrateScene(42).warning).not.toBeNull();
  });

  it("future version pe defaults + warning", () => {
    const result = migrateScene({ version: 99 });
    expect(result.scene).toEqual(createDefaultScene());
    expect(result.warning).toContain("99");
  });

  it("version 0 ke liye migration nahi hai to defaults", () => {
    const result = migrateScene({ version: 0 });
    expect(result.scene).toEqual(createDefaultScene());
    expect(result.warning).toContain("migration");
  });

  it("applyMigrations chain chalti hai", () => {
    const migrations = {
      0: (scene: Record<string, unknown>) => ({
        ...scene,
        version: 1,
        added: true,
      }),
    };
    const result = applyMigrations({ version: 0 }, 0, 1, migrations);
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.scene.added).toBe(true);
  });

  it("missing step pe complete false hota hai", () => {
    const result = applyMigrations({ version: 0 }, 0, 2, {});
    expect(result.complete).toBe(false);
    expect(result.migrated).toBe(false);
  });

  it("same version pe koi migration nahi chalti", () => {
    const result = applyMigrations({ version: 1 }, 1, 1, {});
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(false);
  });
});
