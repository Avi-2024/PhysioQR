# Program Progress and Exercise Tracking Flow

## Purpose

This module tracks patient day-wise rehabilitation progress, exercise video events, skipped exercises, pain feedback, and program completion percentage.

## Roles

- Patient opens unlocked program days, tracks exercise/video events, and submits daily feedback.
- Admin can manually unlock a program day.
- Admin can view progress summary for support/review.

## Main Records

Progress is stored in `ProgramProgress`.

Important fields:

- `patientProgram`: patient enrollment.
- `patient`: patient owner.
- `dayNumber`: program day.
- `dayUnlocked`: manually/system unlocked day flag.
- `dayStarted`, `dayOpenedAt`: patient opened day content.
- `dayCompleted`, `completedAt`: daily completion state.
- `exercises`: per-exercise event state.
- `painScoreBefore`, `painScoreAfter`: daily pain score.
- `difficultyRating`: patient difficulty rating.
- `feedbackText`: patient feedback.
- `discomfortReported`: safety signal.
- `fullSessionCompleted`: whether patient completed the whole session.

Exercise event fields:

- `videoStarted`, `videoStartedAt`
- `videoCompleted`, `videoCompletedAt`
- `markedCompleted`, `markedCompletedAt`
- `skipped`, `skippedAt`, `skipReason`

## Unlock Rules

Supported `PatientProgram.unlockMethod` values:

- `all_at_once`: all days available.
- `every_24_hours`: day unlocks by time since `startDate`.
- `after_completion`: next day unlocks after current day completion.
- `manual`: Admin must unlock days explicitly.

Day 1 is always available once the patient program is active.

## Get Day Content

Endpoint:

`GET /api/progress/:patientProgramId/day/:dayNumber`

Auth:

Patient owner or Admin

Behavior:

1. Loads patient program.
2. Checks ownership unless Admin.
3. Checks unlock rule.
4. Loads `ProgramDay` and exercises.
5. Creates/updates `ProgramProgress`.
6. Marks `dayStarted` and `dayOpenedAt` for patient access.

## Track Exercise Event

Endpoint:

`POST /api/progress/:patientProgramId/day/:dayNumber/exercises/:exerciseId/event`

Auth:

Patient owner

Example:

```json
{
  "eventType": "video_started"
}
```

Supported `eventType` values:

- `video_started`
- `video_completed`
- `marked_completed`
- `skipped`

Skipped example:

```json
{
  "eventType": "skipped",
  "skipReason": "Pain increased"
}
```

Backend validates that the exercise belongs to the requested program day.

## Submit Day Progress

Endpoint:

`POST /api/progress/submit-day`

Auth:

Patient owner

Example:

```json
{
  "patientProgramId": "PATIENT_PROGRAM_ID",
  "dayNumber": 1,
  "exercises": [
    {
      "exercise": "EXERCISE_ID",
      "videoStarted": true,
      "videoCompleted": true,
      "markedCompleted": true
    }
  ],
  "painScoreBefore": 6,
  "painScoreAfter": 4,
  "difficultyRating": 3,
  "feedbackText": "Completed without severe discomfort.",
  "discomfortReported": false,
  "fullSessionCompleted": true
}
```

Day is completed when all submitted exercises are either marked completed or skipped.

When a day is completed:

- `PatientProgram.currentDay` advances.
- `PatientProgram.completionPercentage` is recalculated.
- If the final day is completed, `PatientProgram.status` becomes `completed`.

## Progress Summary

Endpoint:

`GET /api/progress/:patientProgramId/summary`

Auth:

Patient owner or Admin

Returns:

- enrollment status
- current day
- completion percentage
- opened days
- completed days
- completed exercises
- skipped exercises
- full day progress records

## Admin Manual Unlock

Endpoint:

`POST /api/progress/admin-unlock`

Auth:

Admin

Example:

```json
{
  "patientProgramId": "PATIENT_PROGRAM_ID",
  "dayNumber": 3
}
```

Writes audit log action:

- `program_day_unlocked`

## Verification

Covered by `npm run test:integration`:

- patient opens day content
- patient tracks exercise event
- patient submits day progress
- progress summary returns completed day
- Admin manually unlocks a day
