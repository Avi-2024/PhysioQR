# Meta Lead Ads Integration Flow

Meta integration is implemented as its own microservice: `apps/integration-service`.

## Runtime Flow

```text
Meta Lead Form Submitted
  -> POST /webhooks/meta
  -> Verify X-Hub-Signature-256
  -> Resolve source_form by page_id + form_id
  -> Store webhook_events row with tenant_id
  -> Worker fetches full lead details from Meta Graph API
  -> Apply source_field_mappings
  -> POST /internal/leads/import to Lead Management
  -> Lead service creates lead, dynamic custom fields, custom values, timeline, and outbox event
```

## Form Setup

1. Create a Meta connected account:
   `POST /integrations/meta/accounts`
2. Create a form connection:
   `POST /integrations/meta/forms`
3. Add mappings when Meta field names do not match CRM names:
   `POST /integrations/meta/forms/:id/map-fields`

Standard fields are mapped automatically:
- `full_name` or `name` -> `fullName`
- `phone_number`, `phone`, or `mobile` -> `phone`
- `email` or `email_address` -> `email`

## Custom Ad Questions

If the ad asks a question like:

```text
Which course are you interested in?
```

Meta returns it in `field_data` as a field name plus values. The integration service converts the question into a safe CRM key:

```text
which_course_are_you_interested_in
```

Then Lead Management auto-creates a dynamic lead field and stores the answer in `lead_custom_field_values`. This keeps the core `leads` table stable while still preserving every form answer.

Explicit mapping can override this. Example:

```json
{
  "mappings": [
    {
      "externalFieldKey": "whatsapp_number",
      "crmFieldKey": "phone",
      "targetType": "STANDARD"
    },
    {
      "externalFieldKey": "interested_course",
      "crmFieldKey": "course_interest",
      "targetType": "CUSTOM_FIELD"
    }
  ]
}
```

## Safety Rules

- Raw webhook events are tenant-scoped through configured source forms.
- Unknown forms are ignored instead of creating cross-tenant data.
- Duplicate webhook delivery is idempotent through `external_event_id`.
- Meta tokens are encrypted before storage.
- Lead creation uses internal service authentication and still enforces `tenant_id`.
