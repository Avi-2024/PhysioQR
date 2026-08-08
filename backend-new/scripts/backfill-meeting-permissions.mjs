import dotenv from "dotenv";
import { PrismaClient } from "../apps/auth-iam-service/generated/prisma/index.js";
import { PERMISSIONS } from "../packages/contracts/src/permissions.js";

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

const prisma = new PrismaClient();

const meetingPermissions = [
  PERMISSIONS.LEAD_MEETING_CREATE_OWN,
  PERMISSIONS.LEAD_MEETING_CREATE_TEAM,
  PERMISSIONS.LEAD_MEETING_CREATE_ALL,
  PERMISSIONS.LEAD_MEETING_READ_OWN,
  PERMISSIONS.LEAD_MEETING_READ_TEAM,
  PERMISSIONS.LEAD_MEETING_READ_ALL,
  PERMISSIONS.LEAD_MEETING_UPDATE_OWN,
  PERMISSIONS.LEAD_MEETING_UPDATE_TEAM,
  PERMISSIONS.LEAD_MEETING_UPDATE_ALL,
];

const permissionMapping = new Map([
  [PERMISSIONS.LEAD_FOLLOWUP_CREATE_OWN, [PERMISSIONS.LEAD_MEETING_CREATE_OWN]],
  [PERMISSIONS.LEAD_FOLLOWUP_CREATE_ALL, [PERMISSIONS.LEAD_MEETING_CREATE_ALL]],
  [PERMISSIONS.LEAD_READ_OWN, [PERMISSIONS.LEAD_MEETING_READ_OWN]],
  [PERMISSIONS.LEAD_READ_TEAM, [PERMISSIONS.LEAD_MEETING_READ_TEAM]],
  [PERMISSIONS.LEAD_READ_ALL, [PERMISSIONS.LEAD_MEETING_READ_ALL]],
  [PERMISSIONS.LEAD_UPDATE_OWN, [PERMISSIONS.LEAD_MEETING_UPDATE_OWN]],
  [PERMISSIONS.LEAD_UPDATE_TEAM, [PERMISSIONS.LEAD_MEETING_UPDATE_TEAM]],
  [PERMISSIONS.LEAD_UPDATE_ALL, [PERMISSIONS.LEAD_MEETING_UPDATE_ALL]],
]);

// Upserts the meeting permission catalog and maps existing role scopes idempotently.
async function backfillMeetingPermissions() {
  for (const key of meetingPermissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { isActive: true },
      create: { key, description: key, isActive: true },
    });
  }

  const permissionRows = await prisma.permission.findMany({
    where: { key: { in: meetingPermissions } },
  });
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission]));
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    include: { rolePermissions: { include: { permission: true } } },
  });

  let assignmentsCreated = 0;
  for (const role of roles) {
    const currentKeys = new Set(role.rolePermissions.map((item) => item.permission.key));
    const desiredKeys = new Set(role.isSystemRole ? meetingPermissions : []);
    for (const currentKey of currentKeys) {
      for (const mappedKey of permissionMapping.get(currentKey) || []) desiredKeys.add(mappedKey);
    }
    for (const key of desiredKeys) {
      const permission = permissionByKey.get(key);
      if (!permission) continue;
      const result = await prisma.rolePermission.createMany({
        data: [{ tenantId: role.tenantId, roleId: role.id, permissionId: permission.id }],
        skipDuplicates: true,
      });
      assignmentsCreated += result.count;
    }
  }

  return { permissions: meetingPermissions.length, roles: roles.length, assignmentsCreated };
}

backfillMeetingPermissions()
  .then((result) => console.log(JSON.stringify(result)))
  .finally(() => prisma.$disconnect());
