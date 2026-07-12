import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters long.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character.");
