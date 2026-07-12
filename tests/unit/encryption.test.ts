import { describe, expect, it } from "vitest";
import { encryptField, decryptField, maskLast, lastCharacters } from "@/lib/security/encryption";

describe("encryptField / decryptField", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "S1234567A";
    const ciphertext = encryptField(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decryptField(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptField("same-value");
    const b = encryptField("same-value");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("same-value");
    expect(decryptField(b)).toBe("same-value");
  });

  it("fails to decrypt tampered ciphertext (authenticated encryption)", () => {
    const ciphertext = encryptField("sensitive-value");
    const tampered = ciphertext.slice(0, -4) + "abcd";
    expect(() => decryptField(tampered)).toThrow();
  });
});

describe("maskLast", () => {
  it("masks all but the last N characters", () => {
    expect(maskLast("1234567890", 4)).toBe("••••••7890");
  });

  it("masks the whole value when shorter than the visible count", () => {
    expect(maskLast("123", 4)).toBe("•••");
  });
});

describe("lastCharacters", () => {
  it("returns the trailing N characters", () => {
    expect(lastCharacters("S1234567A", 4)).toBe("567A");
  });
});
