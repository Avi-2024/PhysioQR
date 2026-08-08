import { z } from "zod";

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(200),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(20).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(20).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const AuthValidators = Object.freeze({
  login: loginSchema,
  logout: logoutSchema,
  refresh: refreshSchema,
});

export { AuthValidators };
