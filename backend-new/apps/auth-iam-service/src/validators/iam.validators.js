import { z } from "zod";

const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z
    .object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().max(120).optional(),
      status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DELETED"]).optional(),
    })
    .optional(),
});

const resolveUsersSchema = z.object({
  body: z.object({ userIds: z.array(z.string().uuid()).min(1).max(500) }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6).max(30).optional(),
    password: z.string().min(10).max(200),
    roleId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createRoleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().min(2).max(80).regex(/^[A-Z0-9_]+$/),
    description: z.string().trim().max(500).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const rolePermissionsSchema = z.object({
  body: z.object({ permissionKeys: z.array(z.string().trim().min(3).max(160)).min(1).max(500) }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}).optional(),
});

const checkPermissionSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    permission: z.string().trim().min(3).max(160),
    resource: z
      .object({
        ownerId: z.string().uuid().nullable().optional(),
        teamId: z.string().uuid().nullable().optional(),
      })
      .passthrough()
      .optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const emptySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const IamValidators = Object.freeze({
  checkPermission: checkPermissionSchema,
  createRole: createRoleSchema,
  createUser: createUserSchema,
  empty: emptySchema,
  listUsers: listUsersSchema,
  resolveUsers: resolveUsersSchema,
  rolePermissions: rolePermissionsSchema,
});

export { IamValidators };
