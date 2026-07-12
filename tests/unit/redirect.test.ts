import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "@/lib/redirect";

describe("getSafeRedirectPath", () => {
  it("allows a simple internal path", () => {
    expect(getSafeRedirectPath("/administration/users")).toBe(
      "/administration/users"
    );
  });

  it("preserves query strings on internal paths", () => {
    expect(getSafeRedirectPath("/dashboard?tab=overview")).toBe(
      "/dashboard?tab=overview"
    );
  });

  it("falls back for undefined/empty input", () => {
    expect(getSafeRedirectPath(undefined)).toBe("/dashboard");
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
    expect(getSafeRedirectPath("")).toBe("/dashboard");
  });

  it("rejects absolute external URLs", () => {
    expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("http://evil.com/phish")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(getSafeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(getSafeRedirectPath("\\\\evil.com")).toBe("/dashboard");
  });

  it("rejects javascript: and other scheme tricks", () => {
    expect(getSafeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectPath("/  javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects paths not starting with a single slash", () => {
    expect(getSafeRedirectPath("dashboard")).toBe("/dashboard");
  });

  it("uses a custom fallback when provided", () => {
    expect(getSafeRedirectPath("https://evil.com", "/login")).toBe("/login");
  });
});
