import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_TITLE,
  ProjectError,
  decideOpen,
  duplicateTitle,
  imageExtension,
  isOwnProjectPath,
  isProjectId,
  sameInstant,
  sourceImagePath,
  thumbnailPath,
  titleFromFileName,
} from "./project-model";

const UID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("paths", () => {
  it("source + thumb paths user/project folder mein (DB check se match)", () => {
    expect(sourceImagePath(UID, PID, "image/png", "abc123")).toBe(
      `${UID}/${PID}/source-abc123.png`,
    );
    expect(sourceImagePath(UID, PID, "image/jpeg", "../x")).toBe(
      `${UID}/${PID}/source-x.jpg`,
    );
    expect(thumbnailPath(UID, PID)).toBe(`${UID}/${PID}/thumb.webp`);
  });

  it("unsupported mime reject", () => {
    expect(imageExtension("image/webp")).toBe("webp");
    expect(() => imageExtension("image/gif")).toThrow(ProjectError);
  });

  it("isOwnProjectPath: sirf apna folder, koi sub-folder / traversal nahi", () => {
    expect(isOwnProjectPath(`${UID}/${PID}/source-a.png`, UID, PID)).toBe(true);
    expect(isOwnProjectPath(`other/${PID}/source-a.png`, UID, PID)).toBe(false);
    expect(isOwnProjectPath(`${UID}/${PID}/x/source-a.png`, UID, PID)).toBe(
      false,
    );
    expect(isOwnProjectPath(`${UID}/${PID}/../b/a.png`, UID, PID)).toBe(false);
  });

  it("isProjectId UUID check", () => {
    expect(isProjectId(PID)).toBe(true);
    expect(isProjectId("project")).toBe(false);
  });
});

describe("titles", () => {
  it("file name se title", () => {
    expect(titleFromFileName("local/Dashboard_final-v2.png")).toBe(
      "Dashboard final v2",
    );
    expect(titleFromFileName("restored-screenshot")).toBe(
      DEFAULT_PROJECT_TITLE,
    );
    expect(titleFromFileName(null)).toBe(DEFAULT_PROJECT_TITLE);
    expect(titleFromFileName(`${"x".repeat(120)}.png`)).toHaveLength(80);
    expect(duplicateTitle("Launch")).toBe("Launch copy");
  });
});

describe("decideOpen (PJ-4)", () => {
  const server = "2026-10-20T10:00:00.123456+00:00";
  it("no cache → server", () => {
    expect(decideOpen(server, null)).toBe("server");
  });
  it("same base → cache (dirty ya clean)", () => {
    expect(decideOpen(server, { baseUpdatedAt: server, dirty: true })).toBe(
      "cache",
    );
    expect(decideOpen(server, { baseUpdatedAt: server, dirty: false })).toBe(
      "cache",
    );
  });
  it("cloud aage badh gaya + unsynced local → conflict; clean → server", () => {
    const old = "2026-10-20T09:00:00+00:00";
    expect(decideOpen(server, { baseUpdatedAt: old, dirty: true })).toBe(
      "conflict",
    );
    expect(decideOpen(server, { baseUpdatedAt: old, dirty: false })).toBe(
      "server",
    );
  });
  it("sameInstant format difference handle karta hai", () => {
    expect(
      sameInstant("2026-10-20T10:00:00+00:00", "2026-10-20T10:00:00.000Z"),
    ).toBe(true);
    expect(sameInstant("2026-10-20T10:00:00Z", "2026-10-20T10:00:01Z")).toBe(
      false,
    );
  });
});
