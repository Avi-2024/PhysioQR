import assert from "node:assert/strict";
import test from "node:test";
import { EVENTS } from "../packages/contracts/src/events.js";
import { PERMISSIONS } from "../packages/contracts/src/permissions.js";
import { createLeadRepository } from "../apps/lead-management-service/src/repositories/lead.repository.js";
import { createMeetingRepository } from "../apps/lead-management-service/src/repositories/meeting.repository.js";
import { createMeetingService } from "../apps/lead-management-service/src/services/meeting.service.js";

// Creates meeting service dependencies with overridable test doubles.
function meetingDependencies(overrides = {}) {
  return {
    meetingRepository: {
      findConflictingMeeting: async () => null,
      ...(overrides.meetingRepository || {}),
    },
    leadService: overrides.leadService || { getById: async () => ({ id: "lead-1", assignedTo: null, assignedTeamId: null }) },
    authorizationService: overrides.authorizationService || {
      checkPermission: async ({ permission }) => ({ allowed: permission.endsWith(".all"), teamIds: [] }),
    },
    userDirectoryService: overrides.userDirectoryService || {
      listUsers: async () => [],
      resolveUsers: async () => [],
    },
  };
}

test("Follow-up persistence ignores client time and status", async () => {
  let persisted = null;
  const before = Date.now();
  const repository = createLeadRepository({
    $transaction: async (callback) => callback({
      leadFollowup: {
        create: async ({ data }) => {
          persisted = data;
          return { id: "followup-1", ...data };
        },
      },
      leadTimeline: { create: async () => undefined },
      outboxEvent: { create: async () => undefined },
    }),
  });

  await repository.createFollowup({
    tenantId: "tenant-1",
    leadId: "lead-1",
    actorUserId: "user-1",
    payload: {
      followupType: "CALL",
      followupDatetime: new Date("2000-01-01T00:00:00.000Z"),
      status: "PENDING",
    },
  });

  assert.equal(persisted.status, "COMPLETED");
  assert.ok(persisted.followupDatetime.getTime() >= before);
  assert.ok(persisted.followupDatetime.getTime() <= Date.now());
});

test("Follow-up persistence changes lead status in the same transaction", async () => {
  const writes = [];
  const repository = createLeadRepository({
    $transaction: async (callback) => callback({
      lead: {
        update: async ({ data }) => {
          writes.push({ type: "lead", data });
          return data;
        },
      },
      leadFollowup: {
        create: async ({ data }) => {
          writes.push({ type: "followup", data });
          return { id: "followup-1", ...data };
        },
      },
      leadTimeline: {
        create: async ({ data }) => {
          writes.push({ type: "timeline", data });
          return data;
        },
      },
      outboxEvent: {
        create: async ({ data }) => {
          writes.push({ type: "outbox", data });
          return data;
        },
      },
    }),
  });

  await repository.createFollowup({
    tenantId: "tenant-1",
    leadId: "lead-1",
    actorUserId: "user-1",
    previousStatusId: "status-new",
    payload: {
      followupType: "CALL",
      note: "Client requested a proposal.",
      statusId: "status-contacted",
    },
  });

  assert.equal(writes.find((write) => write.type === "lead")?.data.statusId, "status-contacted");
  assert.equal(writes.filter((write) => write.type === "timeline").length, 2);
  assert.deepEqual(
    writes.filter((write) => write.type === "outbox").map((write) => write.data.eventName),
    [EVENTS.LEAD_STATUS_CHANGED, EVENTS.LEAD_FOLLOWUP_CREATED],
  );
});

test("Meeting creation calculates UTC end time and snapshots the matching lead team", async () => {
  let captured = null;
  const staff = {
    id: "staff-1",
    status: "ACTIVE",
    teamIds: ["team-1", "team-2"],
    roleIds: ["role-1"],
    roles: [{ id: "role-1", name: "Frontend Developer", code: "FRONTEND_DEVELOPER" }],
    teams: [{ id: "team-1", name: "Delivery" }],
  };
  const service = createMeetingService(meetingDependencies({
    meetingRepository: {
      createMeeting: async (input) => {
        captured = input;
        return { id: "meeting-1", leadId: input.leadId, createdBy: input.actorUserId, ...input.payload };
      },
    },
    leadService: { getById: async () => ({ id: "lead-1", assignedTo: "staff-1", assignedTeamId: "team-1" }) },
    userDirectoryService: {
      resolveUsers: async () => [staff],
      listUsers: async () => [staff],
    },
  }));

  const result = await service.create(
    { tenantId: "tenant-1", user: { id: "creator-1" } },
    "lead-1",
    {
      title: "Discovery meeting",
      assignedTo: "staff-1",
      mode: "ONLINE",
      startsAt: new Date("2027-01-15T04:30:00.000Z"),
      durationMinutes: 30,
    },
  );

  assert.equal(captured.payload.assignedTeamId, "team-1");
  assert.equal(captured.payload.endsAt.toISOString(), "2027-01-15T05:00:00.000Z");
  assert.equal(result.durationMinutes, 30);
  assert.equal(result.assignedStaff.roles[0].name, "Frontend Developer");
});

test("Own meeting permission cannot schedule another tenant staff member", async () => {
  const service = createMeetingService(meetingDependencies({
    meetingRepository: { createMeeting: async () => assert.fail("meeting should not be persisted") },
    authorizationService: {
      checkPermission: async ({ permission }) => ({
        allowed: permission === PERMISSIONS.LEAD_MEETING_CREATE_OWN,
        teamIds: [],
      }),
    },
    userDirectoryService: {
      resolveUsers: async () => [{ id: "staff-2", status: "ACTIVE", teamIds: [], roleIds: [], roles: [], teams: [] }],
      listUsers: async () => [],
    },
  }));

  await assert.rejects(
    () => service.create(
      { tenantId: "tenant-1", user: { id: "user-1" } },
      "lead-1",
      {
        title: "Forbidden meeting",
        assignedTo: "staff-2",
        mode: "PHONE",
        startsAt: new Date("2027-01-15T04:30:00.000Z"),
        durationMinutes: 30,
      },
    ),
    (error) => error.code === "MEETING_STAFF_FORBIDDEN",
  );
});

test("Meeting creation rejects an overlapping scheduled meeting for the same lead", async () => {
  const service = createMeetingService(meetingDependencies({
    meetingRepository: {
      createMeeting: async () => assert.fail("conflicting meeting should not be persisted"),
      findConflictingMeeting: async () => ({
        id: "meeting-existing",
        leadId: "lead-1",
      }),
    },
    leadService: { getById: async () => ({ id: "lead-1", fullName: "Rohit Bajpai", assignedTo: "staff-1", assignedTeamId: "team-1" }) },
    userDirectoryService: {
      resolveUsers: async () => [{ id: "staff-1", status: "ACTIVE", teamIds: ["team-1"], roleIds: [], roles: [], teams: [] }],
      listUsers: async () => [],
    },
  }));

  await assert.rejects(
    () => service.create(
      { tenantId: "tenant-1", user: { id: "creator-1" } },
      "lead-1",
      {
        title: "Duplicate discovery meeting",
        assignedTo: "staff-1",
        mode: "ONLINE",
        startsAt: new Date("2027-01-15T04:30:00.000Z"),
        durationMinutes: 30,
      },
    ),
    (error) => error.code === "MEETING_LEAD_TIME_CONFLICT" && error.statusCode === 409 && error.message.includes("Rohit Bajpai"),
  );
});

test("Meeting creation rejects double-booking the selected staff member", async () => {
  const service = createMeetingService(meetingDependencies({
    meetingRepository: {
      createMeeting: async () => assert.fail("double-booked staff meeting should not be persisted"),
      findConflictingMeeting: async () => ({
        id: "meeting-existing",
        leadId: "other-lead",
        assignedTo: "staff-1",
      }),
    },
    leadService: { getById: async () => ({ id: "lead-1", fullName: "Rohit Bajpai", assignedTo: "staff-1", assignedTeamId: "team-1" }) },
    userDirectoryService: {
      resolveUsers: async () => [{ id: "staff-1", status: "ACTIVE", teamIds: ["team-1"], roleIds: [], roles: [], teams: [] }],
      listUsers: async () => [],
    },
  }));

  await assert.rejects(
    () => service.create(
      { tenantId: "tenant-1", user: { id: "creator-1" } },
      "lead-1",
      {
        title: "Staff conflict meeting",
        assignedTo: "staff-1",
        mode: "ONLINE",
        startsAt: new Date("2027-01-15T04:30:00.000Z"),
        durationMinutes: 30,
      },
    ),
    (error) => error.code === "MEETING_STAFF_TIME_CONFLICT" && error.statusCode === 409,
  );
});

test("Role calendar filters narrow assignees without changing all-scope authorization", async () => {
  let repositoryFilters = null;
  const service = createMeetingService(meetingDependencies({
    meetingRepository: {
      listMeetings: async (_tenantId, filters, scope) => {
        repositoryFilters = { filters, scope };
        return [];
      },
    },
    userDirectoryService: {
      listUsers: async () => [
        { id: "staff-1", roleIds: ["role-1"] },
        { id: "staff-2", roleIds: ["role-2"] },
      ],
      resolveUsers: async () => [],
    },
  }));

  await service.list(
    { tenantId: "tenant-1", user: { id: "owner-1" } },
    {
      from: new Date("2027-01-01T00:00:00.000Z"),
      to: new Date("2027-02-01T00:00:00.000Z"),
      roleId: "role-1",
    },
  );

  assert.deepEqual(repositoryFilters.filters.assignedUserIds, ["staff-1"]);
  assert.equal(repositoryFilters.scope.scope, "all");
});

test("Calendar rejects unbounded ranges before querying persistence", async () => {
  const service = createMeetingService(meetingDependencies({
    meetingRepository: { listMeetings: async () => assert.fail("repository should not be queried") },
  }));

  await assert.rejects(
    () => service.list(
      { tenantId: "tenant-1", user: { id: "owner-1" } },
      {
        from: new Date("2027-01-01T00:00:00.000Z"),
        to: new Date("2027-04-01T00:00:00.000Z"),
      },
    ),
    (error) => error.code === "MEETING_RANGE_INVALID",
  );
});

test("Lead meeting list checks lead visibility and meeting read scope", async () => {
  let leadReadId = null;
  let repositoryCall = null;
  const staff = {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff User",
    roleIds: [],
    roles: [],
    status: "ACTIVE",
    teamIds: [],
    teams: [],
  };
  const service = createMeetingService(meetingDependencies({
    leadService: {
      getById: async (_context, leadId) => {
        leadReadId = leadId;
        return { id: leadId };
      },
    },
    meetingRepository: {
      listLeadMeetings: async (tenantId, leadId, filters, scope) => {
        repositoryCall = { filters, leadId, scope, tenantId };
        return [{
          id: "meeting-1",
          assignedTo: "staff-1",
          createdBy: "creator-1",
          endsAt: new Date("2027-01-15T05:00:00.000Z"),
          leadId,
          startsAt: new Date("2027-01-15T04:30:00.000Z"),
          status: "SCHEDULED",
        }];
      },
    },
    userDirectoryService: {
      listUsers: async () => [],
      resolveUsers: async () => [staff],
    },
  }));

  const result = await service.listForLead(
    { tenantId: "tenant-1", user: { id: "owner-1" } },
    "lead-1",
    { limit: 25, status: "SCHEDULED" },
  );

  assert.equal(leadReadId, "lead-1");
  assert.equal(repositoryCall.tenantId, "tenant-1");
  assert.equal(repositoryCall.leadId, "lead-1");
  assert.equal(repositoryCall.filters.status, "SCHEDULED");
  assert.equal(repositoryCall.scope.scope, "all");
  assert.equal(result[0].durationMinutes, 30);
  assert.equal(result[0].assignedStaff.name, "Staff User");
});

test("Meeting repository creates timeline and metadata-only outbox records transactionally", async () => {
  let timeline = null;
  let outbox = null;
  const startsAt = new Date("2027-01-15T04:30:00.000Z");
  const endsAt = new Date("2027-01-15T05:00:00.000Z");
  const repository = createMeetingRepository({
    $transaction: async (callback) => callback({
      leadMeeting: {
        create: async ({ data }) => ({ id: "meeting-1", ...data }),
      },
      leadTimeline: { create: async ({ data }) => { timeline = data; } },
      outboxEvent: { create: async ({ data }) => { outbox = data; } },
    }),
  });

  await repository.createMeeting({
    tenantId: "tenant-1",
    leadId: "lead-1",
    actorUserId: "creator-1",
    payload: {
      title: "Architecture meeting",
      assignedTo: "staff-1",
      assignedTeamId: "team-1",
      mode: "OFFICE",
      startsAt,
      endsAt,
    },
  });

  assert.equal(timeline.eventType, "MEETING_CREATED");
  assert.equal(outbox.eventName, EVENTS.MEETING_CREATED);
  assert.deepEqual(outbox.payload, {
    meetingId: "meeting-1",
    leadId: "lead-1",
    assignedTo: "staff-1",
    assignedTeamId: "team-1",
    createdBy: "creator-1",
  });
  assert.equal(Object.hasOwn(outbox.payload, "title"), false);
});

test("Meeting cancellation preserves the record and emits audited metadata", async () => {
  let updateData = null;
  let timeline = null;
  let outbox = null;
  const meeting = {
    id: "meeting-1",
    tenantId: "tenant-1",
    leadId: "lead-1",
    assignedTo: "staff-1",
    assignedTeamId: "team-1",
    createdBy: "creator-1",
    status: "SCHEDULED",
  };
  const repository = createMeetingRepository({
    $transaction: async (callback) => callback({
      leadMeeting: {
        update: async ({ data }) => {
          updateData = data;
          return { ...meeting, ...data };
        },
      },
      leadTimeline: { create: async ({ data }) => { timeline = data; } },
      outboxEvent: { create: async ({ data }) => { outbox = data; } },
    }),
  });

  await repository.cancelMeeting({
    tenantId: "tenant-1",
    meeting,
    reason: "Client requested another date",
    actorUserId: "creator-1",
  });

  assert.equal(updateData.status, "CANCELLED");
  assert.equal(updateData.cancellationReason, "Client requested another date");
  assert.equal(Object.hasOwn(updateData, "deletedAt"), false);
  assert.equal(timeline.eventType, "MEETING_CANCELLED");
  assert.equal(outbox.eventName, EVENTS.MEETING_CANCELLED);
});
