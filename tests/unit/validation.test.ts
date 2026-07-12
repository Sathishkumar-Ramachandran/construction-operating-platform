import { describe, expect, it } from "vitest";
import { loginSchema, changePasswordSchema } from "@/lib/validation/auth";
import { createUserSchema, updateUserSchema } from "@/lib/validation/users";

describe("loginSchema", () => {
  it("accepts a valid email/password pair", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  // No `password` field: initial passwords are always generated
  // server-side (see password-generation-service.test.ts).
  const base = {
    name: "Jane Doe",
    email: "jane@example.com",
    roleCode: "MANAGER",
  };

  it("accepts a valid payload", () => {
    expect(createUserSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an optional employeeId", () => {
    const result = createUserSchema.safeParse({
      ...base,
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role code", () => {
    const result = createUserSchema.safeParse({ ...base, roleCode: "OWNER" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createUserSchema.safeParse({ ...base, email: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("requires a UUID user id", () => {
    const result = updateUserSchema.safeParse({
      userId: "not-a-uuid",
      name: "Valid Name",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const result = updateUserSchema.safeParse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Valid Name",
    });
    expect(result.success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching strong passwords structurally", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "Str0ng!Passw0rd",
      confirmPassword: "Str0ng!Passw0rd",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a weak new password", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "weak",
      confirmPassword: "weak",
    });
    expect(result.success).toBe(false);
  });
});
