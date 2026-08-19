# Notification Delivery Flow

## Purpose

This module centralizes PhysioQR notifications across in-app, email, SMS, and WhatsApp channels. Other modules should create notifications through `notification.service.js` instead of directly calling `Notification.create`.

## Channels

Supported channels:

- `in_app`
- `email`
- `sms`
- `whatsapp`

## Delivery Modes

Environment:

```env
NOTIFICATION_DELIVERY_MODE=log
```

Modes:

- `log`: development/testing mode. Marks notifications as sent without external provider calls.
- `provider`: production mode. Uses Nodemailer for email and Twilio Messaging for SMS/WhatsApp.

## Provider Configuration

Email:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=PhysioQR <no-reply@physioqr.in>
```

SMS:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

WhatsApp:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

OTP still uses Twilio Verify separately through `otp.service.js`.

## Notification Record

Notifications are stored in `Notification`.

Important fields:

- `recipientType`: `patient`, `doctor`, `agent`, `admin`
- `patient`, `doctor`, `agent`, `adminUser`: recipient reference
- `type`: notification business type
- `channel`: delivery channel
- `title`, `message`
- `recipientContact`: resolved or explicitly provided contact
- `status`: `pending`, `sent`, `failed`
- `provider`, `providerMessageId`
- `failureReason`
- `deliveryAttempts`
- `isRead`: in-app read state

## Service API

Use:

```js
const notificationService = require('../services/notification.service');
```

Create one notification:

```js
await notificationService.createNotification({
  recipientType: 'patient',
  patient: patientId,
  type: 'ticket_updated',
  channel: 'in_app',
  title: 'Support ticket updated',
  message: 'Your ticket has a new reply.',
});
```

Create multiple channels:

```js
await notificationService.createNotificationsForChannels(
  {
    recipientType: 'patient',
    patient: patientId,
    type: 'program_activated',
    title: 'Program activated',
    message: 'Your rehabilitation program is active.',
  },
  ['in_app', 'sms']
);
```

Retry one notification:

```js
await notificationService.deliverNotification(notificationId);
```

Process pending notifications:

```js
await notificationService.processPendingNotifications({ limit: 25 });
```

## API Endpoints

### List Notifications

`GET /api/notifications`

Auth:

Any protected role

Rules:

- Patient sees their own notifications.
- Doctor sees their own doctor-profile notifications.
- Agent sees their own agent-profile notifications.
- Admin sees admin notifications by default.
- Admin can use `?all=true` to view all notifications.

Filters:

- `channel`
- `status`
- `type`
- `isRead`
- pagination params

### Mark One Read

`PUT /api/notifications/:id/read`

Only applies to recipient-owned `in_app` notifications.

### Mark All Read

`PUT /api/notifications/read-all`

Marks all unread in-app notifications for current user.

### Admin Create Notification

`POST /api/notifications`

Auth:

Admin

Example:

```json
{
  "recipientType": "patient",
  "patient": "PATIENT_ID",
  "type": "ticket_updated",
  "channels": ["in_app", "sms"],
  "title": "Support ticket updated",
  "message": "Your ticket has a new reply."
}
```

### Admin Retry One Notification

`POST /api/notifications/:id/deliver`

### Admin Process Pending

`POST /api/notifications/process-pending`

```json
{
  "limit": 25,
  "includeFailed": true
}
```

## Current Integrations

These modules now use the central service:

- medical red-flag assessment notification
- support ticket notifications
- clinic visit follow-up reminders

## Verification

Covered by `npm run test:integration`:

- Admin creates in-app and SMS notifications
- delivery log mode marks SMS notification sent
- patient lists notification
- patient marks notification read
- Admin processes pending notifications
