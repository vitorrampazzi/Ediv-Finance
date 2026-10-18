import { z } from "zod";
import {
  isValidNewPassword,
  passwordMaxLength,
  passwordPolicyHint,
} from "../password-policy.mjs";

export const newPasswordSchema = z
  .string()
  .max(passwordMaxLength, { message: passwordPolicyHint })
  .refine(isValidNewPassword, { message: passwordPolicyHint })
  .refine((value) => Buffer.byteLength(value, "utf8") <= 1024, {
    message: passwordPolicyHint,
  });

const existingPasswordSchema = z.string().min(1).max(passwordMaxLength);
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const verificationSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,50}$/),
});

export const registerSchema = z
  .object({
    next: z.string().max(1500).optional(),
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: newPasswordSchema,
  })
  .strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: existingPasswordSchema,
});
export const resetPasswordSchema = z.object({
  token: verificationSchema.shape.token,
  password: newPasswordSchema,
});
export const changePasswordSchema = z.object({
  currentPassword: existingPasswordSchema,
  password: newPasswordSchema,
});
