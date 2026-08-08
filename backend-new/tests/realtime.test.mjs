import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { EVENTS } from "../packages/contracts/src/events.js";
import { PERMISSIONS } from "../packages/contracts/src/permissions.js";
import {
  authenticateRealtimeToken,
  leadCreatedClientPayload,
  leadRoomsForAccess,
  leadRoomsForEvent,
  meetingClientPayload,
  meetingRoomsForAccess,
  meetingRoomsForEvent,
} from "../apps/api-gateway/src/realtime.js";
import { createLeadRepository } from "../apps/lead-management-service/src/repositories/lead.repository.js";
import { runAuthOutboxWorkerLoop } from "../apps/auth-iam-service/src/workers.outbox.js";
import {
  publishLeadOutboxBatch,
  runLeadOutboxWorkerLoop,
} from "../apps/lead-management-service/src/workers.outbox.js";
import { runQuotationDocumentWorkerLoop } from "../apps/lead-management-service/src/workers.quotation-documents.js";
import {
  REALTIME_TRANSPORTS,
  createWakeSignal,
  createRealtimeRedisClient,
  isRecoverableSubscriptionError,
  parseRealtimeEnvelope,
  resolveRealtimeTransport,
} from "../packages/realtime/src/index.js";

test("Realtime socket auth rejects missing tokens", async () => {
  await assert.rejects(
    () => authenticateRealtimeToken({ token: null, accessSecret: "test-secret", accessLoader: async () => ({}) }),
    /AUTH_TOKEN_REQUIRED/,
  );
});

test("Realtime transport selects Upstash REST for HTTPS Redis URLs", () => {
  const transport = resolveRealtimeTransport({
    redisUrl: "https://example.upstash.io",
    redisRestToken: "test-token",
  });

  assert.equal(transport.type, REALTIME_TRANSPORTS.UPSTASH_REST);
  assert.equal(transport.redisRestUrl, "https://example.upstash.io");
});

test("Realtime transport rejects HTTPS Redis URLs without a REST token", () => {
  assert.throws(
    () => resolveRealtimeTransport({ redisUrl: "https://example.upstash.io" }),
    /REDIS_REST_TOKEN/,
  );
});

test("Realtime TCP client rejects REST URLs with an actionable error", () => {
  assert.throws(
    () => createRealtimeRedisClient({ url: "https://example.upstash.io" }),
    /HTTPS REST format/,
  );
});

test("Realtime envelope parser accepts already decoded Upstash REST messages", () => {
  const envelope = {
    eventId: "event-1",
    eventName: EVENTS.LEAD_CREATED,
    tenantId: "tenant-1",
    aggregateId: "lead-1",
    payload: {},
    occurredAt: "2026-07-13T10:00:00.000Z",
  };

  assert.deepEqual(parseRealtimeEnvelope(envelope), envelope);
});

test("Upstash REST subscriber treats undici body timeout as recoverable", () => {
  assert.equal(isRecoverableSubscriptionError({ cause: { code: "UND_ERR_BODY_TIMEOUT" } }), true);
  assert.equal(isRecoverableSubscriptionError({ code: "ECONNREFUSED" }), false);
});

test("Worker wake signal coalesces bursts and retains timeout recovery", async () => {
  const signal = createWakeSignal();
  signal.notify();
  signal.notify();

  assert.equal(await signal.wait(100), "signal");
  assert.equal(await signal.wait(5), "timeout");
  signal.close();
  assert.equal(await signal.wait(100), "closed");
});

test("Realtime socket auth rejects expired tokens", async () => {
  const token = jwt.sign({ sub: "user-1", tenantId: "tenant-1" }, "test-secret", { expiresIn: -1 });

  await assert.rejects(
    () => authenticateRealtimeToken({ token, accessSecret: "test-secret", accessLoader: async () => ({}) }),
    /expired/,
  );
});

test("Realtime socket auth accepts valid tokens and loads IAM access", async () => {
  const token = jwt.sign({ sub: "user-1", tenantId: "tenant-1", email: "agent@example.com" }, "test-secret", { expiresIn: "1h" });
  let loadedPayload = null;

  const auth = await authenticateRealtimeToken({
    token,
    accessSecret: "test-secret",
    accessLoader: async ({ payload }) => {
      loadedPayload = payload;
      return {
        permissions: [PERMISSIONS.LEAD_READ_OWN],
        teamIds: ["team-1"],
        roleIds: ["role-1"],
      };
    },
  });

  assert.equal(loadedPayload.sub, "user-1");
  assert.equal(auth.tenantId, "tenant-1");
  assert.deepEqual(auth.permissions, [PERMISSIONS.LEAD_READ_OWN]);
  assert.deepEqual(auth.teamIds, ["team-1"]);
});

test("Realtime lead rooms reflect all, team, and own read permissions", () => {
  assert.deepEqual(
    leadRoomsForAccess({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: [PERMISSIONS.LEAD_READ_ALL],
      teamIds: ["team-1"],
    }),
    ["tenant:tenant-1:leads:all"],
  );
  assert.deepEqual(
    leadRoomsForAccess({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: [PERMISSIONS.LEAD_READ_TEAM],
      teamIds: ["team-1", "team-2"],
    }),
    ["tenant:tenant-1:leads:team:team-1", "tenant:tenant-1:leads:team:team-2"],
  );
  assert.deepEqual(
    leadRoomsForAccess({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: [PERMISSIONS.LEAD_READ_OWN],
      teamIds: [],
    }),
    ["tenant:tenant-1:leads:user:user-1"],
  );
});

test("Realtime lead rooms block users without lead read access", () => {
  assert.deepEqual(
    leadRoomsForAccess({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: [PERMISSIONS.AUTH_USER_READ],
      teamIds: ["team-1"],
    }),
    [],
  );
});

test("Lead created events route to all, matching team, and matching owner rooms without leaking PII", () => {
  const envelope = {
    eventId: "event-1",
    eventName: EVENTS.LEAD_CREATED,
    tenantId: "tenant-1",
    aggregateId: "lead-1",
    occurredAt: "2026-07-11T10:00:00.000Z",
    payload: {
      leadId: "lead-1",
      assignedTo: "user-1",
      assignedTeamId: "team-1",
      sourceId: "source-1",
      email: "hidden@example.com",
    },
  };

  assert.deepEqual(leadRoomsForEvent(envelope), [
    "tenant:tenant-1:leads:all",
    "tenant:tenant-1:leads:team:team-1",
    "tenant:tenant-1:leads:user:user-1",
  ]);
  assert.deepEqual(leadCreatedClientPayload(envelope), {
    eventId: "event-1",
    tenantId: "tenant-1",
    leadId: "lead-1",
    sourceId: "source-1",
    occurredAt: "2026-07-11T10:00:00.000Z",
  });
});

test("Meeting realtime rooms and payload enforce scoped metadata-only delivery", () => {
  assert.deepEqual(
    meetingRoomsForAccess({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: [PERMISSIONS.LEAD_MEETING_READ_TEAM, PERMISSIONS.LEAD_MEETING_READ_OWN],
      teamIds: ["team-1"],
    }),
    ["tenant:tenant-1:meetings:team:team-1", "tenant:tenant-1:meetings:user:user-1"],
  );

  const envelope = {
    eventId: "event-meeting-1",
    eventName: EVENTS.MEETING_CREATED,
    tenantId: "tenant-1",
    aggregateId: "meeting-1",
    occurredAt: "2026-07-12T10:00:00.000Z",
    payload: {
      meetingId: "meeting-1",
      leadId: "lead-1",
      assignedTo: "user-1",
      assignedTeamId: "team-1",
      createdBy: "creator-1",
      title: "Must not be emitted",
      note: "Must not be emitted",
    },
  };

  assert.deepEqual(meetingRoomsForEvent(envelope), [
    "tenant:tenant-1:meetings:all",
    "tenant:tenant-1:meetings:team:team-1",
    "tenant:tenant-1:meetings:user:user-1",
    "tenant:tenant-1:meetings:user:creator-1",
  ]);
  assert.deepEqual(meetingClientPayload(envelope), {
    eventId: "event-meeting-1",
    tenantId: "tenant-1",
    meetingId: "meeting-1",
    leadId: "lead-1",
    occurredAt: "2026-07-12T10:00:00.000Z",
  });
});

test("Lead creation writes realtime routing metadata to outbox payload", async () => {
  let outboxPayload = null;
  const createdAt = new Date("2026-07-11T10:00:00.000Z");
  const repository = createLeadRepository({
    $transaction: async (callback) =>
      callback({
        lead: {
          create: async ({ data }) => ({
            ...data,
            id: "lead-1",
            createdAt,
          }),
          findFirst: async () => ({ id: "lead-1" }),
        },
        leadCustomFieldValue: {
          create: async () => undefined,
        },
        leadTimeline: {
          create: async () => undefined,
        },
        outboxEvent: {
          create: async ({ data }) => {
            outboxPayload = data.payload;
          },
        },
      }),
  });

  await repository.createLead({
    lead: {
      tenantId: "tenant-1",
      pipelineId: "pipeline-1",
      statusId: "status-1",
      sourceId: "source-1",
      assignedTo: "user-1",
      assignedTeamId: "team-1",
      fullName: "Hidden Name",
      createdBy: "actor-1",
      updatedBy: "actor-1",
    },
    customValues: [],
    actorUserId: "actor-1",
  });

  assert.deepEqual(outboxPayload, {
    leadId: "lead-1",
    assignedTo: "user-1",
    assignedTeamId: "team-1",
    sourceId: "source-1",
    createdAt: "2026-07-11T10:00:00.000Z",
  });
});

test("Lead outbox worker publishes lead.created events and marks them published", async () => {
  const updates = [];
  const published = [];
  const event = {
    id: "event-1",
    tenantId: "tenant-1",
    eventName: EVENTS.LEAD_CREATED,
    aggregateId: "lead-1",
    payload: {
      leadId: "lead-1",
      assignedTo: "user-1",
      assignedTeamId: "team-1",
      sourceId: "source-1",
      createdAt: "2026-07-11T10:00:00.000Z",
    },
    createdAt: new Date("2026-07-11T10:00:00.000Z"),
  };

  const result = await publishLeadOutboxBatch({
    prisma: {
      outboxEvent: {
        findMany: async () => [event],
        update: async (payload) => {
          updates.push(payload);
        },
      },
    },
    publisher: {
      enabled: true,
      publish: async (envelope) => {
        published.push(envelope);
      },
    },
    logger: { error: () => undefined, warn: () => undefined },
  });

  assert.equal(result.published, 1);
  assert.equal(updates.length, 1);
  assert.equal(published[0].payload.assignedTeamId, "team-1");
});

test("Lead outbox worker leaves events unpublished when Redis publish fails", async () => {
  const updates = [];
  const result = await publishLeadOutboxBatch({
    prisma: {
      outboxEvent: {
        findMany: async () => [
          {
            id: "event-1",
            tenantId: "tenant-1",
            eventName: EVENTS.LEAD_CREATED,
            aggregateId: "lead-1",
            payload: { leadId: "lead-1" },
            createdAt: new Date("2026-07-11T10:00:00.000Z"),
          },
        ],
        update: async (payload) => {
          updates.push(payload);
        },
      },
    },
    publisher: {
      enabled: true,
      publish: async () => {
        throw new Error("redis down");
      },
    },
    logger: { error: () => undefined, warn: () => undefined },
  });

  assert.equal(result.failed, 1);
  assert.equal(updates.length, 0);
});

test("Lead outbox worker publishes metadata-only meeting events", async () => {
  const published = [];
  const result = await publishLeadOutboxBatch({
    prisma: {
      outboxEvent: {
        findMany: async () => [{
          id: "event-meeting-1",
          tenantId: "tenant-1",
          eventName: EVENTS.MEETING_UPDATED,
          aggregateId: "meeting-1",
          payload: {
            meetingId: "meeting-1",
            leadId: "lead-1",
            assignedTo: "user-1",
            assignedTeamId: "team-1",
            createdBy: "creator-1",
            title: "Hidden title",
          },
          createdAt: new Date("2026-07-12T10:00:00.000Z"),
        }],
        update: async () => undefined,
      },
    },
    publisher: {
      enabled: true,
      publish: async (envelope) => published.push(envelope),
    },
    logger: { error: () => undefined, warn: () => undefined },
  });

  assert.equal(result.published, 1);
  assert.deepEqual(published[0].payload, {
    meetingId: "meeting-1",
    leadId: "lead-1",
    assignedTo: "user-1",
    assignedTeamId: "team-1",
    createdBy: "creator-1",
  });
});

test("Lead outbox loop waits on worker signals instead of fixed polling", async () => {
  let finds = 0;
  let waits = 0;
  let listenerClosed = false;

  await runLeadOutboxWorkerLoop({
    intervalMs: 60_000,
    iterations: 2,
    logger: { info: () => undefined, error: () => undefined, warn: () => undefined },
    workerFactory: async () => ({
      prisma: {
        outboxEvent: {
          findMany: async () => {
            finds += 1;
            return [];
          },
        },
        $disconnect: async () => undefined,
      },
      publisher: {
        enabled: true,
        publish: async () => undefined,
        close: async () => undefined,
      },
    }),
    wakeListenerFactory: () => ({
      connect: async () => undefined,
      interrupt: () => undefined,
      wait: async () => {
        waits += 1;
        return "signal";
      },
      close: async () => {
        listenerClosed = true;
      },
    }),
  });

  assert.equal(finds, 2);
  assert.equal(waits, 1);
  assert.equal(listenerClosed, true);
});

test("Auth outbox loop waits on worker signals instead of fixed polling", async () => {
  let finds = 0;
  let waits = 0;

  await runAuthOutboxWorkerLoop({
    intervalMs: 60_000,
    iterations: 2,
    prisma: {
      outboxEvent: {
        findMany: async () => {
          finds += 1;
          return [];
        },
      },
      $disconnect: async () => undefined,
    },
    logger: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined,
    },
    wakeListenerFactory: () => ({
      connect: async () => undefined,
      interrupt: () => undefined,
      wait: async () => {
        waits += 1;
        return "signal";
      },
      close: async () => undefined,
    }),
  });

  assert.equal(finds, 2);
  assert.equal(waits, 1);
});

test("Quotation document loop waits on worker signals instead of fixed polling", async () => {
  let claims = 0;
  let waits = 0;

  await runQuotationDocumentWorkerLoop({
    intervalMs: 60_000,
    iterations: 2,
    logger: { error: () => undefined, info: () => undefined, warn: () => undefined },
    workerFactory: () => ({
      prisma: { $disconnect: async () => undefined },
      quotationRepository: {
        claimDocumentJobs: async () => {
          claims += 1;
          return [];
        },
      },
      storage: { enabled: true },
      renderer: { close: async () => undefined },
    }),
    wakeListenerFactory: () => ({
      connect: async () => undefined,
      interrupt: () => undefined,
      wait: async () => {
        waits += 1;
        return "signal";
      },
      close: async () => undefined,
    }),
  });

  assert.equal(claims, 2);
  assert.equal(waits, 1);
});
