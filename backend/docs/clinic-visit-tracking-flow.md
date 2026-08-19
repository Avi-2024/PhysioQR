# Clinic Visit Tracking Flow

## Purpose

This module lets Agents record clinic visits, schedule follow-ups, update visit outcomes, and track due follow-ups. Admin can view all visit activity for reporting and supervision.

## Roles

- Agent creates and manages only their own clinic visits.
- Admin lists all clinic visits across agents.
- Agent cannot attach another agent's doctor to a visit.

## Visit Data

Clinic visits are stored in `ClinicVisit`.

Important fields:

- `agent`: owning agent.
- `doctor`: optional registered doctor.
- `doctorName`: free-text doctor name for pre-registration visits.
- `clinicName`: visited clinic.
- `visitDate`, `visitTime`: visit schedule.
- `clinicLocation`: address or location text.
- `discussionDetails`: meeting notes.
- `doctorInterestLevel`: `very_interested`, `interested`, `neutral`, `not_interested`.
- `documentsCollected`: uploaded/collected document labels.
- `outcome`: final visit outcome.
- `followUpDate`: next follow-up date.
- `followUpStatus`: `not_required`, `scheduled`, `completed`, `missed`, `cancelled`.
- `followUpCompletedAt`, `followUpCompletedNote`: completion record.
- `nextAction`: next action after follow-up.
- `photo`, `attachment`: optional evidence/attachment URLs.

## Supported Outcomes

- `doctor_registered`
- `interested`
- `follow_up_required`
- `not_interested`
- `call_later`
- `clinic_closed`
- `incorrect_location`

## Agent Create Flow

Endpoint:

`POST /api/agents/me/visits`

Auth:

Agent

Required:

```json
{
  "visitDate": "2026-08-13",
  "outcome": "follow_up_required"
}
```

Example:

```json
{
  "doctor": "DOCTOR_ID",
  "clinicName": "City Ortho Clinic",
  "visitDate": "2026-08-13",
  "visitTime": "11:30",
  "clinicLocation": "Delhi",
  "discussionDetails": "Doctor wants QR standee details.",
  "doctorInterestLevel": "interested",
  "documentsCollected": ["medical_registration"],
  "followUpDate": "2026-08-16",
  "followUpNotes": "Call with pricing plan.",
  "outcome": "follow_up_required"
}
```

Backend behavior:

1. Resolves authenticated agent profile.
2. If `doctor` is provided, verifies doctor belongs to the same agent.
3. Sets `followUpStatus` to `scheduled` when outcome is `follow_up_required` or `followUpDate` exists.
4. Creates an Agent in-app notification `clinic_visit_reminder` when a follow-up is scheduled.

## Agent Listing Flow

Endpoint:

`GET /api/agents/me/visits?page=1&limit=20&outcome=follow_up_required&followUpStatus=scheduled&search=ortho`

Auth:

Agent

Rules:

- Agent sees only their own visits.
- Results are paginated.
- Supports filters: `doctorId`, `outcome`, `followUpStatus`, `fromDate`, `toDate`, `search`.

## Agent Follow-Up Queue

Endpoint:

`GET /api/agents/me/follow-ups?due=true`

Auth:

Agent

Rules:

- Defaults to `followUpStatus=scheduled`.
- `due=true` returns scheduled follow-ups where `followUpDate <= now`.

## Visit Detail

Endpoint:

`GET /api/agents/me/visits/:visitId`

Auth:

Agent

Agent can access only their own visit.

## Visit Update

Endpoint:

`PATCH /api/agents/me/visits/:visitId`

Auth:

Agent

Use for general visit edits such as notes, outcome, follow-up date, and attachments.

Audit action:

- `clinic_visit_updated`

## Follow-Up Update

Endpoint:

`PATCH /api/agents/me/visits/:visitId/follow-up`

Auth:

Agent

Example:

```json
{
  "followUpStatus": "completed",
  "note": "Doctor agreed to submit documents tomorrow.",
  "nextAction": "Collect KYC documents"
}
```

Audit action:

- `clinic_follow_up_updated`

## Admin Listing Flow

Endpoint:

`GET /api/agents/visits?page=1&limit=20&agentId=...&outcome=interested`

Auth:

Admin

Admin can view all visits and filter by agent, doctor, outcome, follow-up status, date range, and search.

## Dashboard Impact

Agent dashboard now includes:

- `pendingFollowUps`
- `upcomingFollowUps`
- `recentVisits`

## Verification

Covered by `npm run test:integration`:

- agent creates clinic visit
- agent lists own visits
- agent views visit detail
- agent updates visit notes
- agent completes follow-up
- Admin lists all clinic visits
