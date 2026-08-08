const EVENTS = Object.freeze({
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  LEAD_ASSIGNED: "lead.assigned",
  LEAD_BULK_ASSIGNED: "lead.bulk_assigned",
  LEAD_STATUS_CHANGED: "lead.status_changed",
  LEAD_FOLLOWUP_CREATED: "lead.followup_created",
  MEETING_CREATED: "meeting.created",
  MEETING_UPDATED: "meeting.updated",
  MEETING_CANCELLED: "meeting.cancelled",
  QUOTATION_CREATED: "quotation.created",
  QUOTATION_UPDATED: "quotation.updated",
  QUOTATION_SENT: "quotation.sent",
  QUOTATION_REVISION_CREATED: "quotation.revision_created",
  QUOTATION_STATUS_CHANGED: "quotation.status_changed",
  QUOTATION_DELETED: "quotation.deleted",
  META_LEAD_RECEIVED: "meta.lead_received",
  META_LEAD_SYNCED: "meta.lead_synced",
  META_LEAD_SYNC_FAILED: "meta.lead_sync_failed",
  PERMISSION_UPDATED: "permission.updated",
});

// Builds a consistent event envelope for outbox publishing.
function createEventEnvelope({ eventName, aggregateId, payload, actorId }) {
  return {
    eventName,
    aggregateId,
    actorId: actorId || null,
    payload,
    occurredAt: new Date().toISOString(),
  };
}

export { EVENTS, createEventEnvelope };
