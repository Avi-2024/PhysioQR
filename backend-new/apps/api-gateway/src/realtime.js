import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "../../../packages/config/src/index.js";
import { serviceRequest } from "../../../packages/common/src/index.js";
import { EVENTS } from "../../../packages/contracts/src/events.js";
import { PERMISSIONS } from "../../../packages/contracts/src/permissions.js";
import { createLogger } from "../../../packages/logger/src/index.js";
import {
  REALTIME_CHANNELS,
  REALTIME_TRANSPORTS,
  createRealtimeRedisClient,
  createUpstashRealtimeSubscriber,
  parseRealtimeEnvelope,
  resolveRealtimeTransport,
} from "../../../packages/realtime/src/index.js";

const LEAD_READ_PERMISSIONS = new Set([
  PERMISSIONS.LEAD_READ_OWN,
  PERMISSIONS.LEAD_READ_TEAM,
  PERMISSIONS.LEAD_READ_ALL,
]);

const MEETING_READ_PERMISSIONS = new Set([
  PERMISSIONS.LEAD_MEETING_READ_OWN,
  PERMISSIONS.LEAD_MEETING_READ_TEAM,
  PERMISSIONS.LEAD_MEETING_READ_ALL,
]);

// Checks whether a permission list grants the requested permission.
function hasPermission(permissions = [], permission) {
  return permissions.includes("*") || permissions.includes(permission);
}

// Builds the company-wide all-leads room name.
function leadAllRoom() {
  return "company:leads:all";
}

// Builds the team lead room name.
function leadTeamRoom(teamId) {
  return `company:leads:team:${teamId}`;
}

// Builds the own-lead room name.
function leadUserRoom(userId) {
  return `company:leads:user:${userId}`;
}

// Builds the company-wide all-meetings room name.
function meetingAllRoom() {
  return "company:meetings:all";
}

// Builds the team meeting room name.
function meetingTeamRoom(teamId) {
  return `company:meetings:team:${teamId}`;
}

// Builds the own-meeting room name.
function meetingUserRoom(userId) {
  return `company:meetings:user:${userId}`;
}

// Returns whether the connected user has any lead read capability.
function hasAnyLeadReadPermission(permissions = []) {
  return permissions.includes("*") || permissions.some((permission) => LEAD_READ_PERMISSIONS.has(permission));
}

// Returns whether the connected user has any meeting read capability.
function hasAnyMeetingReadPermission(permissions = []) {
  return permissions.includes("*") || permissions.some((permission) => MEETING_READ_PERMISSIONS.has(permission));
}

// Computes Socket.IO rooms a connection may join for lead events.
function leadRoomsForAccess({ userId, permissions = [], teamIds = [] }) {
  if (!userId || !hasAnyLeadReadPermission(permissions)) {
    return [];
  }

  const rooms = new Set();
  if (hasPermission(permissions, PERMISSIONS.LEAD_READ_ALL)) {
    rooms.add(leadAllRoom());
  }
  if (hasPermission(permissions, PERMISSIONS.LEAD_READ_TEAM)) {
    for (const teamId of teamIds || []) {
      if (teamId) rooms.add(leadTeamRoom(teamId));
    }
  }
  if (hasPermission(permissions, PERMISSIONS.LEAD_READ_OWN)) {
    rooms.add(leadUserRoom(userId));
  }
  return [...rooms];
}

// Computes target rooms for a lead.created event.
function leadRoomsForEvent(envelope) {
  const payload = envelope.payload || {};
  const rooms = new Set([leadAllRoom()]);
  if (payload.assignedTeamId) {
    rooms.add(leadTeamRoom(payload.assignedTeamId));
  }
  if (payload.assignedTo) {
    rooms.add(leadUserRoom(payload.assignedTo));
  }
  return [...rooms];
}

// Computes Socket.IO rooms a connection may join for meeting events.
function meetingRoomsForAccess({ userId, permissions = [], teamIds = [] }) {
  if (!userId || !hasAnyMeetingReadPermission(permissions)) return [];
  const rooms = new Set();
  if (hasPermission(permissions, PERMISSIONS.LEAD_MEETING_READ_ALL)) rooms.add(meetingAllRoom());
  if (hasPermission(permissions, PERMISSIONS.LEAD_MEETING_READ_TEAM)) {
    for (const teamId of teamIds || []) {
      if (teamId) rooms.add(meetingTeamRoom(teamId));
    }
  }
  if (hasPermission(permissions, PERMISSIONS.LEAD_MEETING_READ_OWN)) rooms.add(meetingUserRoom(userId));
  return [...rooms];
}

// Computes target rooms for one meeting event without exposing meeting content.
function meetingRoomsForEvent(envelope) {
  const payload = envelope.payload || {};
  const rooms = new Set([meetingAllRoom()]);
  if (payload.assignedTeamId) rooms.add(meetingTeamRoom(payload.assignedTeamId));
  if (payload.assignedTo) rooms.add(meetingUserRoom(payload.assignedTo));
  if (payload.createdBy) rooms.add(meetingUserRoom(payload.createdBy));
  return [...rooms];
}

// Converts an internal lead event envelope into the public client payload.
function leadCreatedClientPayload(envelope) {
  const payload = envelope.payload || {};
  return {
    eventId: envelope.eventId,
    leadId: payload.leadId || envelope.aggregateId,
    sourceId: payload.sourceId || null,
    occurredAt: envelope.occurredAt,
  };
}

// Converts an internal meeting event into a metadata-only client payload.
function meetingClientPayload(envelope) {
  const payload = envelope.payload || {};
  return {
    eventId: envelope.eventId,
    meetingId: payload.meetingId || envelope.aggregateId,
    leadId: payload.leadId || null,
    occurredAt: envelope.occurredAt,
  };
}

// Loads current IAM permissions for the realtime socket user.
async function loadRealtimeAccess({ token, payload }) {
  const response = await serviceRequest(`${config.authIam.baseUrl}/iam/check-permission`, {
    method: "POST",
    context: {
      rawAuthorization: `Bearer ${token}`,
      user: { id: payload.sub },
    },
    body: {
      userId: payload.sub,
      permission: PERMISSIONS.LEAD_READ_OWN,
      resource: {},
    },
  });
  return response.data;
}

// Authenticates a Socket.IO handshake token and returns realtime access context.
async function authenticateRealtimeToken({ token, accessSecret = config.auth.accessSecret, accessLoader = loadRealtimeAccess }) {
  if (!token) {
    throw new Error("AUTH_TOKEN_REQUIRED");
  }
  if (!accessSecret) {
    throw new Error("AUTH_ACCESS_SECRET_MISSING");
  }

  const payload = jwt.verify(token, accessSecret);
  const access = await accessLoader({ token, payload });
  return {
    userId: payload.sub,
    email: payload.email || null,
    expiresAtMs: payload.exp ? payload.exp * 1000 : null,
    permissions: access?.permissions || [],
    teamIds: access?.teamIds || [],
    roleIds: access?.roleIds || [],
  };
}

// Creates Socket.IO middleware for JWT and IAM access loading.
function createSocketAuthenticator({ accessSecret = config.auth.accessSecret, accessLoader = loadRealtimeAccess } = {}) {
  return async (socket, next) => {
    try {
      const accessToken = socket.handshake.auth?.accessToken;
      socket.data.auth = await authenticateRealtimeToken({ token: accessToken, accessSecret, accessLoader });
      return next();
    } catch (error) {
      return next(new Error(error.message || "REALTIME_AUTH_FAILED"));
    }
  };
}

// Joins the authenticated socket to RBAC-aware lead rooms.
function joinLeadRealtimeRooms(socket) {
  const rooms = [
    ...leadRoomsForAccess(socket.data.auth || {}),
    ...meetingRoomsForAccess(socket.data.auth || {}),
  ];
  if (rooms.length) {
    socket.join(rooms);
  }
  return rooms;
}

// Disconnects a socket when its access token reaches expiration.
function scheduleSocketExpiry(socket) {
  const expiresAtMs = socket.data.auth?.expiresAtMs;
  if (!expiresAtMs) return null;

  const ttlMs = expiresAtMs - Date.now();
  if (ttlMs <= 0) {
    socket.disconnect(true);
    return null;
  }

  const timeoutId = setTimeout(() => {
    socket.disconnect(true);
  }, Math.min(ttlMs, 2_147_483_647));
  socket.once("disconnect", () => clearTimeout(timeoutId));
  return timeoutId;
}

// Emits a lead.created event to local sockets in authorized rooms.
function emitLeadCreated(io, envelope) {
  const clientPayload = leadCreatedClientPayload(envelope);
  if (!clientPayload.leadId) {
    return false;
  }

  const rooms = leadRoomsForEvent(envelope);
  const target = rooms.reduce((operator, room) => operator.to(room), io.local);
  target.emit(EVENTS.LEAD_CREATED, clientPayload);
  return true;
}

// Emits one meeting event to local sockets in authorized calendar rooms.
function emitMeetingEvent(io, envelope) {
  const clientPayload = meetingClientPayload(envelope);
  if (!clientPayload.meetingId) return false;
  const rooms = meetingRoomsForEvent(envelope);
  const target = rooms.reduce((operator, room) => operator.to(room), io.local);
  target.emit(envelope.eventName, clientPayload);
  return true;
}

// Handles one Redis lead event message for connected gateway sockets.
function handleLeadRealtimeMessage({ io, message, logger }) {
  try {
    const envelope = parseRealtimeEnvelope(message);
    if (envelope.eventName === EVENTS.LEAD_CREATED) return emitLeadCreated(io, envelope);
    if ([EVENTS.MEETING_CREATED, EVENTS.MEETING_UPDATED, EVENTS.MEETING_CANCELLED].includes(envelope.eventName)) {
      return emitMeetingEvent(io, envelope);
    }
    return false;
  } catch (error) {
    logger.error({ err: error }, "Failed to handle realtime lead message");
    return false;
  }
}

// Attaches Socket.IO and Redis-backed realtime delivery to the HTTP server.
async function attachRealtimeServer(httpServer, {
  logger = createLogger("api-gateway-realtime"),
  accessLoader = loadRealtimeAccess,
  redisClientFactory = createRealtimeRedisClient,
  upstashSubscriberFactory = createUpstashRealtimeSubscriber,
} = {}) {
  if (!config.realtime.enabled) {
    logger.info("Realtime socket server disabled");
    return { enabled: false, close: async () => undefined };
  }
  const transport = resolveRealtimeTransport({
    redisUrl: config.realtime.redisUrl,
    redisRestUrl: config.realtime.redisRestUrl,
    redisRestToken: config.realtime.redisRestToken,
  });

  const io = new Server(httpServer, {
    path: config.realtime.socketPath,
    cors: { credentials: true, origin: true },
  });
  let adapterPublisher = null;
  let adapterSubscriber = null;
  let eventSubscriber = null;

  if (transport.type === REALTIME_TRANSPORTS.UPSTASH_REST) {
    eventSubscriber = upstashSubscriberFactory({
      url: transport.redisRestUrl,
      token: transport.redisRestToken,
      logger,
      name: "lead-event-upstash-subscriber",
    });
    await eventSubscriber.connect();
  } else {
    adapterPublisher = redisClientFactory({ url: transport.redisUrl, logger, name: "socket-adapter-publisher" });
    adapterSubscriber = redisClientFactory({ url: transport.redisUrl, logger, name: "socket-adapter-subscriber" });
    eventSubscriber = redisClientFactory({ url: transport.redisUrl, logger, name: "lead-event-subscriber" });
    await Promise.all([adapterPublisher.connect(), adapterSubscriber.connect(), eventSubscriber.connect()]);
    io.adapter(createAdapter(adapterPublisher, adapterSubscriber));
  }

  io.use(createSocketAuthenticator({ accessLoader }));
  io.on("connection", (socket) => {
    const rooms = joinLeadRealtimeRooms(socket);
    scheduleSocketExpiry(socket);
    logger.info({ userId: socket.data.auth?.userId, rooms: rooms.length }, "Realtime socket connected");
  });

  await eventSubscriber.subscribe(REALTIME_CHANNELS.LEAD_EVENTS, (message) => {
    handleLeadRealtimeMessage({ io, message, logger });
  });

  logger.info({ path: config.realtime.socketPath, channel: REALTIME_CHANNELS.LEAD_EVENTS, transport: transport.type }, "Realtime socket server enabled");
  return {
    enabled: true,
    io,
    close: async () => {
      io.close();
      await Promise.allSettled([
        eventSubscriber.unsubscribe(REALTIME_CHANNELS.LEAD_EVENTS),
        eventSubscriber.quit(),
        adapterSubscriber?.quit(),
        adapterPublisher?.quit(),
      ]);
    },
  };
}

export {
  attachRealtimeServer,
  authenticateRealtimeToken,
  createSocketAuthenticator,
  emitLeadCreated,
  emitMeetingEvent,
  handleLeadRealtimeMessage,
  hasAnyLeadReadPermission,
  hasAnyMeetingReadPermission,
  leadCreatedClientPayload,
  leadRoomsForAccess,
  leadRoomsForEvent,
  meetingClientPayload,
  meetingRoomsForAccess,
  meetingRoomsForEvent,
  scheduleSocketExpiry,
};
