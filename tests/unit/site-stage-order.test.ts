import { describe, expect, it } from "vitest";
import {
  SITE_STAGE_ORDER,
  ProjectStatus,
  isFinalSiteStage,
  isProjectStatusTransitionAllowed,
  nextSiteStage,
} from "@/lib/projects/constants";

describe("nextSiteStage", () => {
  it("walks all 8 stages in order", () => {
    for (let i = 0; i < SITE_STAGE_ORDER.length - 1; i += 1) {
      expect(nextSiteStage(SITE_STAGE_ORDER[i])).toBe(SITE_STAGE_ORDER[i + 1]);
    }
  });

  it("returns null past the last stage", () => {
    expect(nextSiteStage(SITE_STAGE_ORDER[SITE_STAGE_ORDER.length - 1])).toBeNull();
  });
});

describe("isFinalSiteStage", () => {
  it("is true only for Handover & Documentation", () => {
    for (const stage of SITE_STAGE_ORDER) {
      const expected = stage === SITE_STAGE_ORDER[SITE_STAGE_ORDER.length - 1];
      expect(isFinalSiteStage(stage)).toBe(expected);
    }
  });
});

describe("isProjectStatusTransitionAllowed", () => {
  it("allows DRAFT -> ACTIVE and DRAFT -> CLOSED", () => {
    expect(isProjectStatusTransitionAllowed(ProjectStatus.DRAFT, ProjectStatus.ACTIVE)).toBe(true);
    expect(isProjectStatusTransitionAllowed(ProjectStatus.DRAFT, ProjectStatus.CLOSED)).toBe(true);
  });

  it("allows ACTIVE -> CLOSED", () => {
    expect(isProjectStatusTransitionAllowed(ProjectStatus.ACTIVE, ProjectStatus.CLOSED)).toBe(true);
  });

  it("rejects ACTIVE -> DRAFT (no reopening)", () => {
    expect(isProjectStatusTransitionAllowed(ProjectStatus.ACTIVE, ProjectStatus.DRAFT)).toBe(false);
  });

  it("rejects any transition out of CLOSED (terminal state)", () => {
    for (const status of Object.values(ProjectStatus)) {
      expect(isProjectStatusTransitionAllowed(ProjectStatus.CLOSED, status)).toBe(false);
    }
  });

  it("rejects a same-status transition", () => {
    expect(isProjectStatusTransitionAllowed(ProjectStatus.ACTIVE, ProjectStatus.ACTIVE)).toBe(false);
  });
});
