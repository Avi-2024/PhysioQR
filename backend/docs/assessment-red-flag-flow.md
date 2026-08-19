# Assessment and Red-Flag Review Flow

## Purpose

This module handles patient pain assessments, conditional assessment questions, red-flag detection, and Admin clinical-safety review before a rehabilitation program can be considered safe to activate.

## Main Roles

- Admin creates pain categories and assessment questions.
- Patient submits answers after registration, OTP verification, and consent.
- Admin reviews high-risk assessments and marks them cleared or blocked.

## Question Configuration

Assessment questions are stored in `AssessmentQuestion`.

Important fields:

- `questionText`: main question text.
- `questionType`: `single_choice`, `multiple_choice`, `yes_no`, `pain_scale`, `number`, `text`, `date`, or `image`.
- `painCategory`: optional category link. If empty, the question is treated as global.
- `isRedFlag`: marks the question as safety-sensitive.
- `redFlagOperator`: how the red flag is matched.
- `redFlagAnswerValues`: answer values that trigger the red flag.
- `redFlagMinValue` and `redFlagMaxValue`: numeric thresholds for pain scale or number questions.
- `redFlagSafetyMessage`: patient/admin-facing safety context.
- `conditionalLogic`: controls when a question is visible based on a previous answer.

Supported operators:

- `any_answer`
- `equals`
- `not_equals`
- `includes`
- `gte`
- `lte`
- `between`

## Conditional Question Flow

1. Admin creates a base question.
2. Admin creates a dependent question using `conditionalLogic.dependsOnQuestion`.
3. During assessment submission, backend evaluates submitted answers.
4. Hidden/inactive questions are rejected if submitted.
5. Only active and visible questions are accepted.

Example:

```json
{
  "questionText": "Did you have recent surgery?",
  "questionType": "yes_no"
}
```

Dependent question:

```json
{
  "questionText": "What was the surgery date?",
  "questionType": "date",
  "conditionalLogic": {
    "dependsOnQuestion": "QUESTION_ID",
    "operator": "equals",
    "value": "yes"
  }
}
```

## Red-Flag Detection Flow

1. Patient submits assessment answers.
2. Backend loads active global and category questions.
3. Backend filters questions based on conditional visibility.
4. Backend checks red-flag rules against actual submitted answers.
5. If one or more red flags are detected:
   - `PatientAssessment.hasRedFlag = true`
   - `PatientAssessment.status = pending_review`
   - `redFlagDetails` stores matched question, answer, reason, and safety message
   - Admin in-app notification is created with type `high_risk_assessment`
   - Audit log action `high_risk_assessment_submitted` is written
6. If no red flag is detected:
   - `PatientAssessment.status = cleared`

## Admin Review Flow

Admin uses:

- `GET /api/assessments/red-flags`
- `PATCH /api/assessments/:id/review`

Review body:

```json
{
  "status": "cleared",
  "note": "Reviewed and cleared for standard program access."
}
```

Allowed review statuses:

- `cleared`
- `blocked`

When Admin reviews:

- `status` is updated.
- `adminReviewNote` is stored.
- `reviewedBy` and `reviewedAt` are stored.
- Audit log action is written:
  - `assessment_red_flag_cleared`
  - `assessment_red_flag_blocked`

## API Summary

### Create Pain Category

`POST /api/assessments/categories`

Auth: Admin

### Create Question

`POST /api/assessments/questions`

Auth: Admin

### Get Questions

`GET /api/assessments/questions?categoryId=...`

Auth: Public

Returns active category and global questions.

### Submit Assessment

`POST /api/assessments/submit`

Auth: Patient or Admin

### List Red-Flag Assessments

`GET /api/assessments/red-flags?status=pending_review&page=1&limit=20`

Auth: Admin

### Review Assessment

`PATCH /api/assessments/:id/review`

Auth: Admin

## Program Activation Rule

Program activation should not happen automatically when the latest required assessment has:

- `hasRedFlag = true`
- `status = pending_review`
- `status = blocked`

Only `cleared` assessments should be treated as clinically cleared.

## Verification

Covered by `npm run test:integration`:

- high-risk assessment detection
- Admin red-flag list
- Admin review clear workflow
- audit and notification write path
