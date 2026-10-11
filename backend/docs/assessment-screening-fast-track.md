# Assessment screening: low-risk fast-track with urgent safety override

## Policy (new assessments only)

Patients cannot wait unnecessarily for manual approval, but **counting true
medical red flags and ignoring the first two would be unsafe**. PhysioQR
now distinguishes:

| Screened findings | New assessment status | Clinical review |
| --- | --- | --- |
| 0 routine warnings and no critical flags | cleared | No |
| 1–2 *clinician-classified routine* warnings and no critical flags | cleared | No |
| 3+ *clinician-classified routine* warnings | pending_review | Yes |
| Any critical red flag (even 1) | pending_review | Yes |
| Post-operative or explicitly review-required pathway | pending_review | Yes |

The number threshold of **3** is ONLY for clinician-classified routine
concerns. This is a proposed operational setting, not a validated clinical
risk score. Have a qualified clinician approve its use for each type of
routine screening question.

**All previous red-flag questions remain CRITICAL by default**; none are
silently downgraded by a deployment or seeder. Unknown severity is also
critical, not routine. Examples of potentially dangerous questions in
the seed library include bladder/bowel changes, saddle numbness, worsening
bilateral leg weakness, serious trauma and systemic illness. Do NOT classify
these as routine to avoid queueing patients. These specific seeded
urgent questions are **hard-protected in the backend**: a direct API update,
Admin edit, or accidentally modified database severity does not permit them
to use the routine fast-track.

## How an Admin can classify a non-urgent routine concern

1. Admin → Assessments → find and open the specific question.
2. Click **Edit question and scope**.
3. Under Screening classification, choose:
   - **Critical red flag** (default; 1 matching answer triggers review), or
   - **Clinician-classified routine concern** (3+ matching answers trigger review).
4. For routine classification, supply the *actual* reviewing clinician's name
   and a detailed clinical justification. Backend verifies the fields, records
   the Admin identity/timestamp in the question, and audit-logs the change.
5. Save and test the assessment in a staging environment. If the safety rule
   changes later, routine classification must be documented again.

The controls cannot diagnose urgency: **actual clinical oversight** is
required. Never use routine classification for any symptom needing urgent
assessment, and do not fabricate a clinician review.

## Technical protection

- Both `POST /api/assessments/submit` and the legacy submit controller
  evaluate structured matched answers on the backend.
- `AssessmentQuestion.redFlagSeverity` defaults to `critical`; effective
  routine classification requires a stored clinician's name.
- The submitted assessment saves `redFlagDetails[].severity`,
  `routineFlagCount`, `criticalFlagCount`, `clinicalSelectionRequired`,
  and the current `status`.
- New 0–2 routine cases can proceed directly to programme matching/payment
  if other eligibility conditions are met. No unnecessary Admin notification
  is sent.
- 3+ routine cases, any critical finding or mandatory post-op review blocks
  programme payment/activation until clinician clearance.
- Historical assessments do **not** get retroactively reclassified. For
  historical data missing `clinicalSelectionRequired`, the previous
  `hasRedFlag || requiresPhysioReview` policy continues.
- Patient onboarding uses server `assessment.status` as the authority.
- This fast-track does not override content publication rules or allow
  payment for an unpublished rehabilitation programme.

## Tests

From `backend`:

```powershell
node --test tests/patientAssessmentClearance.test.js tests/assessmentFlagSeverity.test.js
```

Check in staging: zero flags (fast-track), 1 and 2 *actual clinician-marked
routine* findings (fast-track), 3 routine findings (review), 1 critical
finding (review), and post-op with 0 flags (review).

**Do not use count alone to classify medical danger.**
