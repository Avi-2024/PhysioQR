# Patient assessment visibility — Phase 1

This feature controls **which new assessment choices patients can see**. It does not
remove body regions, surgeries, previous assessments, programmes or video records.

## Where to manage it

1. Sign in as Admin.
2. Open **Clinical Pathways**.
3. In **What can patients select?**, use the General or Post-operative
   **Shown / Hidden** controls for a body region.
4. Under **Choose post-operative surgeries**, show or hide individual operations.
5. Confirm the action and enter a short reason. Changes are audit-logged.

A region must be globally active in **Body Regions**, and a surgery must be
globally active, before it can appear to new patients. A post-operative region
is only offered if it also has at least one published, active surgery type.

## Initial Phase 1 defaults (for existing records without explicit Admin settings)

| Case type | Visible body regions |
| --- | --- |
| Pain / Injury / Movement (General) | Spine (labelled Back Pain (Spine)), Neck, Knee, Shoulder |
| Post-Surgery Rehabilitation | Knee, Shoulder |

Initial published surgeries:
- `total_knee_replacement` — Total Knee Replacement (TKR)
- `shoulder_replacement` — Shoulder Replacement

Other regions (hip, wrist, ankle, etc.) and surgeries remain saved but hidden
from new patient assessments. The seeded `Upper Back` and `Lower Back` records
are also separate advanced regions and initially hidden; publish them only when
their own care pathways are clinically ready.

An Admin's saved switches **override** the initial name/code defaults. No
one needs to edit the frontend to publish new joints.

## Before publishing a new option

Have the clinical team review the pathway questions, red flags, surgery
requirements, exercise mapping, patient-facing videos and safety guidance.
Publication controls do **not** fabricate exercises, guarantee video readiness
or bypass mandatory post-operative review/payment gates.

## Patient/API behavior

- `GET /api/assessments/pathways`: case types, no body regions until selected.
- `GET /api/assessments/pathways?caseTypeId=<ID>`: body regions published for
  the selected case type.
- `GET /api/assessments/surgery-types?caseTypeId=<ID>&bodyRegionId=<ID>`:
  only published and active surgeries for that post-op pathway.
- `GET /api/assessments/questions` and `POST /api/assessments/submit`:
  unpublished body-region or surgery selections are rejected server-side.
- Historical assessment, billing, enrolment and exercise data are unaffected.

Admin-only actions:
- `PATCH /api/admin/assessment-pathways/body-regions/:id/visibility`
  with `{ "pathway": "general" | "postOperative", "visible": true|false, "reason": "..." }`.
- `PATCH /api/admin/assessment-pathways/surgery-types/:id/visibility`
  with `{ "visible": true|false, "reason": "..." }`.

## Testing

From `backend`:

```sh
npm run test:assessment-visibility
```

Then test in a browser: select General (expect four default options), select
Post-operative (expect Knee and Shoulder), check the surgery dropdown (only
published procedures), hide a region from Admin and verify it disappears for
new assessments. Confirm previously saved assessments remain intact.
If a database was never seeded, run the existing clinically-approved seeding
process in the intended environment first. Do not run destructive reset scripts.

NOTE: The assessment seeder respects globally inactive records. It does not
reactivate Admin-disabled regions or surgeries during future seeding runs.
