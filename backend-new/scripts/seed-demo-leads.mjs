import { PrismaClient as AuthPrismaClient } from "../apps/auth-iam-service/generated/prisma/index.js";
import { PrismaClient as LeadPrismaClient } from "../apps/lead-management-service/generated/prisma/index.js";
import bcrypt from "bcryptjs";
import { DEFAULT_OWNER_PERMISSIONS, PERMISSIONS } from "../packages/contracts/src/permissions.js";

const authPrisma = new AuthPrismaClient();
const leadPrisma = new LeadPrismaClient();

const pipelineStatuses = [
  { name: "New", code: "NEW", color: "#2563EB", sortOrder: 10, isInitial: true },
  { name: "Contacted", code: "CONTACTED", color: "#0891B2", sortOrder: 20 },
  { name: "Qualified", code: "QUALIFIED", color: "#7C3AED", sortOrder: 30 },
  { name: "Proposal", code: "PROPOSAL", color: "#F59E0B", sortOrder: 40 },
  { name: "Won", code: "WON", color: "#059669", sortOrder: 50, isFinal: true, finalType: "WON" },
  { name: "Lost", code: "LOST", color: "#DC2626", sortOrder: 60, isFinal: true, finalType: "LOST" },
];

const leadSources = [
  { name: "Meta Lead Ads", code: "META_LEAD_ADS", type: "META" },
  { name: "Website Form", code: "WEBSITE_FORM", type: "WEB" },
  { name: "Google Search", code: "GOOGLE_SEARCH", type: "PAID_SEARCH" },
  { name: "Referral", code: "REFERRAL", type: "PARTNER" },
];

const employeeUsers = [
  { name: "Hitesh", email: "hitesh@gmail.com" },
  { name: "Payal", email: "payal@gmail.com" },
  { name: "Khushi", email: "khushi@gmail.com" },
];

const employeePermissions = [
  PERMISSIONS.AUTH_USER_READ,
  PERMISSIONS.LEAD_CREATE_OWN,
  PERMISSIONS.LEAD_READ_OWN,
  PERMISSIONS.LEAD_UPDATE_OWN,
  PERMISSIONS.LEAD_STATUS_CHANGE_OWN,
  PERMISSIONS.LEAD_FOLLOWUP_CREATE_OWN,
  PERMISSIONS.LEAD_MEETING_CREATE_OWN,
  PERMISSIONS.LEAD_MEETING_READ_OWN,
  PERMISSIONS.LEAD_MEETING_UPDATE_OWN,
];

const demoLeads = [
  ["Aarav Sharma", "+91 98765 43210", "aarav.sharma@example.com", "HOT", "URGENT", "NEW", "META_LEAD_ADS", "Enterprise CRM migration", "120000"],
  ["Neha Verma", "+91 98111 22445", "neha.verma@example.com", "WARM", "HIGH", "CONTACTED", "WEBSITE_FORM", "Lead automation workflow", "65000"],
  ["Rahul Mehta", "+91 99887 77665", "rahul.mehta@example.com", "HOT", "HIGH", "QUALIFIED", "META_LEAD_ADS", "Meta lead capture setup", "85000"],
  ["Priya Nair", "+91 90000 11122", "priya.nair@example.com", "COLD", "MEDIUM", "NEW", "GOOGLE_SEARCH", "Demo request", "30000"],
  ["Kabir Khan", "+91 91234 56789", "kabir.khan@example.com", "WARM", "MEDIUM", "PROPOSAL", "REFERRAL", "Sales pipeline cleanup", "55000"],
  ["Isha Patel", "+91 93456 78120", "isha.patel@example.com", "HOT", "HIGH", "CONTACTED", "META_LEAD_ADS", "Multi-branch CRM", "95000"],
  ["Vikram Singh", "+91 94567 89012", "vikram.singh@example.com", "COLD", "LOW", "NEW", "WEBSITE_FORM", "Pricing question", "18000"],
  ["Ananya Rao", "+91 95678 90123", "ananya.rao@example.com", "WARM", "HIGH", "QUALIFIED", "GOOGLE_SEARCH", "White-label CRM", "78000"],
  ["Rohan Gupta", "+91 96789 01234", "rohan.gupta@example.com", "HOT", "URGENT", "PROPOSAL", "META_LEAD_ADS", "Urgent sales dashboard", "140000"],
  ["Meera Joshi", "+91 97890 12345", "meera.joshi@example.com", "COLD", "MEDIUM", "LOST", "REFERRAL", "Budget mismatch", "22000"],
  ["Arjun Bansal", "+91 98901 23456", "arjun.bansal@example.com", "WARM", "MEDIUM", "WON", "WEBSITE_FORM", "CRM starter plan", "45000"],
  ["Sana Qureshi", "+91 99012 34567", "sana.qureshi@example.com", "HOT", "HIGH", "QUALIFIED", "META_LEAD_ADS", "Lead source attribution", "88000"],
  ["Dev Malhotra", "+91 90123 45678", "dev.malhotra@example.com", "COLD", "LOW", "CONTACTED", "GOOGLE_SEARCH", "Basic inquiry", "15000"],
  ["Kavya Iyer", "+91 91230 45678", "kavya.iyer@example.com", "WARM", "HIGH", "NEW", "META_LEAD_ADS", "Follow-up automation", "72000"],
  ["Nitin Sethi", "+91 92340 56789", "nitin.sethi@example.com", "HOT", "URGENT", "CONTACTED", "WEBSITE_FORM", "Team assignment rules", "105000"],
  ["Pooja Menon", "+91 93450 67890", "pooja.menon@example.com", "WARM", "MEDIUM", "QUALIFIED", "REFERRAL", "Custom lead fields", "52000"],
  ["Aditya Kulkarni", "+91 94560 78901", "aditya.kulkarni@example.com", "COLD", "MEDIUM", "NEW", "GOOGLE_SEARCH", "Product walkthrough", "26000"],
  ["Tanvi Desai", "+91 95670 89012", "tanvi.desai@example.com", "HOT", "HIGH", "PROPOSAL", "META_LEAD_ADS", "Lead Ads integration", "99000"],
];

// Normalizes email values for duplicate-safe seed records.
function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

// Normalizes phone values for duplicate-safe seed records.
function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

// Resolves the tenant and owner user that should receive demo leads.
async function resolveSeedOwner() {
  const email = normalizeEmail(process.env.SEED_OWNER_EMAIL || process.env.BOOTSTRAP_OWNER_EMAIL || "royalit@gmail.com");
  const user = await authPrisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { tenant: true, teamMembers: true },
  });

  if (!user) {
    throw new Error(`Seed owner not found for email ${email}. Login/bootstrap the account first.`);
  }

  return {
    tenantId: user.tenantId,
    tenantSlug: user.tenant.slug,
    userId: user.id,
    teamId: user.teamMembers[0]?.teamId || null,
  };
}

// Ensures one permission catalog row exists and is active.
async function ensurePermission(permissionKey) {
  return authPrisma.permission.upsert({
    where: { key: permissionKey },
    update: { isActive: true },
    create: { key: permissionKey, description: permissionKey, isActive: true },
  });
}

// Replaces one role permission set with the provided permission keys.
async function replaceRolePermissions(tenantId, roleId, permissionKeys) {
  const permissions = [];
  for (const permissionKey of permissionKeys) {
    permissions.push(await ensurePermission(permissionKey));
  }

  await authPrisma.rolePermission.deleteMany({ where: { tenantId, roleId } });
  await authPrisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      tenantId,
      roleId,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });
}

// Ensures Super Admin and Employee roles exist for the tenant.
async function ensureTenantRoles(tenantId) {
  const superAdminRole = await authPrisma.role.upsert({
    where: { tenantId_code: { tenantId, code: "SUPER_ADMIN" } },
    update: { name: "Super Admin", isActive: true, isSystemRole: true },
    create: {
      tenantId,
      name: "Super Admin",
      code: "SUPER_ADMIN",
      description: "Tenant super admin with full CRM access",
      isSystemRole: true,
    },
  });

  const employeeRole = await authPrisma.role.upsert({
    where: { tenantId_code: { tenantId, code: "EMPLOYEE" } },
    update: { name: "Employee", isActive: true },
    create: {
      tenantId,
      name: "Employee",
      code: "EMPLOYEE",
      description: "Sales employee with assigned lead access",
    },
  });

  await replaceRolePermissions(tenantId, superAdminRole.id, DEFAULT_OWNER_PERMISSIONS);
  await replaceRolePermissions(tenantId, employeeRole.id, employeePermissions);
  return { employeeRole, superAdminRole };
}

// Ensures the owner has the Super Admin role.
async function ensureOwnerRole(tenantId, userId, roleId) {
  const existing = await authPrisma.userRole.findFirst({
    where: { tenantId, userId, roleId, teamId: null },
  });
  if (!existing) {
    await authPrisma.userRole.create({ data: { tenantId, userId, roleId, teamId: null } });
  }
}

// Ensures the round-robin employee users exist and have the Employee role.
async function ensureEmployees(tenantId, roleId) {
  const passwordHash = await bcrypt.hash("12345678", 12);
  const users = [];

  for (const employee of employeeUsers) {
    const existing = await authPrisma.user.findFirst({
      where: { tenantId, email: normalizeEmail(employee.email), deletedAt: null },
    });
    const user = existing
      ? await authPrisma.user.update({
          where: { id: existing.id },
          data: { name: employee.name, passwordHash, status: "ACTIVE" },
        })
      : await authPrisma.user.create({
          data: {
            tenantId,
            name: employee.name,
            email: normalizeEmail(employee.email),
            passwordHash,
            status: "ACTIVE",
          },
        });

    const existingRole = await authPrisma.userRole.findFirst({
      where: { tenantId, userId: user.id, roleId, teamId: null },
    });
    if (!existingRole) {
      await authPrisma.userRole.create({ data: { tenantId, userId: user.id, roleId, teamId: null } });
    }
    users.push(user);
  }

  return users;
}

// Ensures the default lead pipeline and statuses exist for a tenant.
async function ensurePipeline(tenantId) {
  const pipeline = await leadPrisma.leadPipeline.upsert({
    where: { tenantId_name: { tenantId, name: "Default Sales Pipeline" } },
    update: { isDefault: true, status: "ACTIVE" },
    create: { tenantId, name: "Default Sales Pipeline", isDefault: true },
  });

  await leadPrisma.leadPipeline.updateMany({
    where: { tenantId, id: { not: pipeline.id } },
    data: { isDefault: false },
  });

  const statuses = {};
  for (const status of pipelineStatuses) {
    statuses[status.code] = await leadPrisma.leadStatus.upsert({
      where: { tenantId_pipelineId_code: { tenantId, pipelineId: pipeline.id, code: status.code } },
      update: { ...status, status: "ACTIVE" },
      create: { tenantId, pipelineId: pipeline.id, ...status },
    });
  }

  return { pipeline, statuses };
}

// Ensures the configured demo lead sources exist for a tenant.
async function ensureSources(tenantId) {
  const sources = {};
  for (const source of leadSources) {
    sources[source.code] = await leadPrisma.leadSource.upsert({
      where: { tenantId_code: { tenantId, code: source.code } },
      update: { name: source.name, type: source.type, status: "ACTIVE" },
      create: { tenantId, ...source },
    });
  }
  return sources;
}

// Ensures dynamic lead fields used by the demo data exist for a tenant.
async function ensureFields(tenantId) {
  const fields = [
    { fieldKey: "interest", label: "Interest", fieldType: "TEXT", sortOrder: 10, isSearchable: true, isFilterable: true },
    { fieldKey: "budget", label: "Budget", fieldType: "NUMBER", sortOrder: 20, isSearchable: false, isFilterable: true },
  ];

  const ensured = {};
  for (const field of fields) {
    ensured[field.fieldKey] = await leadPrisma.leadFieldDefinition.upsert({
      where: { tenantId_module_fieldKey: { tenantId, module: "lead", fieldKey: field.fieldKey } },
      update: { ...field, module: "lead", status: "ACTIVE" },
      create: { tenantId, module: "lead", ...field },
    });
  }
  return ensured;
}

// Upserts one lead and its demo custom field values.
async function upsertLead({ tenantId, userId, teamId, pipeline, statuses, sources, fields, row, index }) {
  const [fullName, phone, email, leadScore, priority, statusCode, sourceCode, interest, budget] = row;
  const createdAt = new Date(Date.now() - index * 7 * 60 * 60 * 1000);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  const existing = await leadPrisma.lead.findFirst({
    where: { tenantId, normalizedEmail },
  });

  const leadPayload = {
    tenantId,
    pipelineId: pipeline.id,
    statusId: statuses[statusCode].id,
    sourceId: sources[sourceCode].id,
    assignedTo: userId,
    assignedTeamId: teamId,
    fullName,
    phone,
    normalizedPhone,
    email,
    normalizedEmail,
    leadScore,
    priority,
    customFieldsJson: { interest, budget: Number(budget) },
    updatedBy: userId,
    deletedAt: null,
  };

  const lead = existing
    ? await leadPrisma.lead.update({
        where: { id: existing.id },
        data: leadPayload,
      })
    : await leadPrisma.lead.create({
        data: {
          ...leadPayload,
          createdBy: userId,
          createdAt,
        },
      });

  await leadPrisma.leadCustomFieldValue.upsert({
    where: { tenantId_leadId_fieldKey: { tenantId, leadId: lead.id, fieldKey: "interest" } },
    update: { fieldDefinitionId: fields.interest.id, valueText: interest, valueNumber: null, valueDate: null, valueJson: null },
    create: { tenantId, leadId: lead.id, fieldDefinitionId: fields.interest.id, fieldKey: "interest", valueText: interest },
  });

  await leadPrisma.leadCustomFieldValue.upsert({
    where: { tenantId_leadId_fieldKey: { tenantId, leadId: lead.id, fieldKey: "budget" } },
    update: { fieldDefinitionId: fields.budget.id, valueText: null, valueNumber: Number(budget), valueDate: null, valueJson: null },
    create: { tenantId, leadId: lead.id, fieldDefinitionId: fields.budget.id, fieldKey: "budget", valueNumber: Number(budget) },
  });

  await leadPrisma.leadTimeline.create({
    data: {
      tenantId,
      leadId: lead.id,
      eventType: "SEED_SYNCED",
      title: "Demo lead synced",
      description: "Seeded for CRM lead-management testing.",
      performedBy: userId,
    },
  });

  if (index < 8) {
    await leadPrisma.leadFollowup.create({
      data: {
        tenantId,
        leadId: lead.id,
        followupType: index % 2 === 0 ? "CALL" : "WHATSAPP",
        followupDatetime: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        status: "PENDING",
        note: `Follow up about ${interest}.`,
        createdBy: userId,
      },
    });
  }

  return lead;
}

// Ensures tenant lead assignment settings use the demo employee pool.
async function ensureAssignmentSettings(tenantId, employees, actorUserId) {
  return leadPrisma.leadAssignmentSetting.upsert({
    where: { tenantId },
    update: {
      roundRobinEnabled: true,
      roundRobinUserIds: employees.map((employee) => employee.id),
      updatedBy: actorUserId,
    },
    create: {
      tenantId,
      roundRobinEnabled: true,
      roundRobinUserIds: employees.map((employee) => employee.id),
      updatedBy: actorUserId,
    },
  });
}

// Seeds realistic dummy leads into the lead-management database.
async function main() {
  const owner = await resolveSeedOwner();
  const roles = await ensureTenantRoles(owner.tenantId);
  await ensureOwnerRole(owner.tenantId, owner.userId, roles.superAdminRole.id);
  const employees = await ensureEmployees(owner.tenantId, roles.employeeRole.id);
  await ensureAssignmentSettings(owner.tenantId, employees, owner.userId);
  const { pipeline, statuses } = await ensurePipeline(owner.tenantId);
  const sources = await ensureSources(owner.tenantId);
  const fields = await ensureFields(owner.tenantId);

  let count = 0;
  for (const [index, row] of demoLeads.entries()) {
    await upsertLead({
      tenantId: owner.tenantId,
      userId: employees[index % employees.length]?.id || owner.userId,
      teamId: owner.teamId,
      pipeline,
      statuses,
      sources,
      fields,
      row,
      index,
    });
    count += 1;
  }

  console.log(`Seeded ${count} demo leads and ${employees.length} employees for tenant ${owner.tenantSlug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([authPrisma.$disconnect(), leadPrisma.$disconnect()]);
  });
