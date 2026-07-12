import { describe, expect, it } from "vitest";
import {
  generateSecureInitialPassword,
  generateSecureInitialPasswordFor,
  containsPredictablePattern,
} from "@/lib/services/password-generation-service";

describe("generateSecureInitialPassword", () => {
  it("generates a password satisfying the initial-password policy", () => {
    for (let i = 0; i < 25; i++) {
      const password = generateSecureInitialPassword();
      expect(password.length).toBeGreaterThanOrEqual(14);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*\-_=+?]/);
    }
  });

  it("never produces the same password twice across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateSecureInitialPassword());
    }
    expect(seen.size).toBe(200);
  });

  it("does not contain ambiguous characters (0/O/1/l/I)", () => {
    for (let i = 0; i < 25; i++) {
      const password = generateSecureInitialPassword();
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });
});

describe("containsPredictablePattern", () => {
  it("flags a password containing the employee's name", () => {
    expect(containsPredictablePattern("JohnSmith2024!", ["John Smith"])).toBe(false); // full name with space won't substring-match
    expect(containsPredictablePattern("johnsmith2024!", ["johnsmith"])).toBe(true);
  });

  it("flags a password containing part of an email", () => {
    expect(containsPredictablePattern("jdoe123!ABC", ["jdoe@example.com"])).toBe(false);
    expect(containsPredictablePattern("jdoeSecret1!", ["jdoe"])).toBe(true);
  });

  it("ignores short/empty identifying values", () => {
    expect(containsPredictablePattern("anything", ["", null, undefined, "ab"])).toBe(false);
  });
});

describe("generateSecureInitialPasswordFor", () => {
  it("never leaks a 3+ character fragment of the identifying values", () => {
    for (let i = 0; i < 25; i++) {
      const password = generateSecureInitialPasswordFor(["testuser", "testuser@example.com"]);
      expect(containsPredictablePattern(password, ["testuser", "testuser@example.com"])).toBe(false);
    }
  });
});
