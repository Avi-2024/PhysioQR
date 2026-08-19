# Support Ticket Flow

## Purpose

This module lets Patients, Doctors, and Agents raise support tickets, while Admin manages status, priority, assignment, responses, and resolution notes.

## Roles

- Patient creates and follows up on their own tickets.
- Doctor creates and follows up on tickets linked to their doctor profile.
- Agent creates and follows up on tickets linked to their agent profile.
- Admin views all tickets and updates status, priority, assignment, and official responses.

## Ticket Data

Support tickets are stored in `SupportTicket`.

Important fields:

- `ticketId`: readable ticket ID such as `TKA1B2C3D4`.
- `userType`: `patient`, `doctor`, or `agent`.
- `patient`, `doctor`, `agent`: requester profile reference.
- `assignedTo`: Admin/User assigned to handle the ticket.
- `category`: issue category.
- `subject`: short issue title.
- `description`: original issue details.
- `priority`: `low`, `medium`, `high`.
- `status`: `open`, `in_progress`, `waiting_for_user`, `resolved`, `closed`, `reopened`.
- `messages`: conversation history.
- `adminResponse`: latest official admin response.
- `resolutionNotes`: admin resolution notes.
- `lastResponseAt`, `closedAt`: operational timestamps.

## Create Flow

Endpoint:

`POST /api/support`

Auth:

Patient, Doctor, or Agent

Required:

```json
{
  "category": "technical",
  "subject": "Video not opening",
  "description": "Day 2 video is not loading",
  "priority": "high"
}
```

Backend behavior:

1. Resolves requester profile from authenticated user.
2. Creates ticket linked to requester.
3. Stores description as the first message.
4. Creates Admin in-app notification `support_ticket_created`.

Admin cannot create requester tickets from this endpoint.

## Listing Flow

Endpoint:

`GET /api/support?page=1&limit=20&status=open&category=technical&priority=high&search=video`

Auth:

Any protected role

Rules:

- Admin sees all tickets.
- Patient sees only their own tickets.
- Doctor sees only their own doctor-profile tickets.
- Agent sees only their own agent-profile tickets.

Response is paginated:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

## Detail Flow

Endpoint:

`GET /api/support/:id`

Auth and ownership rules are the same as list.

## Admin Status and Response Flow

Endpoint:

`PATCH /api/support/:id/status`

Auth:

Admin only

Example:

```json
{
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "ADMIN_USER_ID",
  "adminResponse": "We are checking this now.",
  "resolutionNotes": "Initial technical review started."
}
```

Backend behavior:

1. Updates status, priority, assignment, and notes.
2. Adds `adminResponse` into `messages`.
3. Creates requester in-app notification `ticket_updated`.
4. Writes audit log action `support_ticket_status_updated`.

## Message Flow

Endpoint:

`POST /api/support/:id/messages`

Auth:

Admin or ticket owner

Example:

```json
{
  "message": "I still cannot open the video.",
  "attachment": "https://..."
}
```

Rules:

- Ticket owner can message only their own ticket.
- Admin can reply to any ticket.
- If requester replies to a `resolved` or `closed` ticket, status becomes `reopened`.
- Admin replies create requester notification.
- Requester replies create Admin notification.

## Frontend Notes

- Use a list page with filters for status, category, priority, and search.
- Use a detail page with message timeline.
- Admin UI should use the status PATCH endpoint for workflow changes.
- User UI should use message POST for follow-up replies.

## Verification

Covered by `npm run test:integration`:

- patient ticket creation
- Admin ticket listing
- Admin status/response update
- patient follow-up message
