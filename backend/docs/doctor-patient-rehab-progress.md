# Doctor: Referred Patient Rehab Monitoring

## Purpose

Doctors need to review patients' day-wise rehabilitation reports in detail, not just payment or programme enrollment status. Data is already saved by the patient from **Patient > Programme > Daily Session**.

## Navigation

- Doctor > My Patients > **View progress**
- Doctor > My Patients > Patient rehabilitation monitoring page
- Route: `/doctor/patients/:patientId/progress`

## API

`GET /api/doctors/me/patients/:patientId/progress`

**Access**: authenticated `doctor` role only. The backend resolves the doctor from `Doctor.user`, then requires `Patient.referringDoctor` to match that doctor before looking up any sessions. Programme enrollments are further scoped to `PatientProgram.doctor`. Public patient numbers (`PT00011`) and MongoDB IDs are supported.

A patient with no referring doctor or referred by a different doctor returns the same 404 response as an unknown patient. No private progress data is disclosed. The response disables shared caching.

### Patient report data

The API includes:

- Programme: status, total days, current day, completion percentage, start/end
- Overall and programme totals: completed/opened/reported days, completed/skipped exercises, feedback count
- Day-wise patient submissions: pain before and after (0–10), change within the session, difficulty, written feedback, discomfort report, completion, timestamps
- Exercise events: watched/started video, video completed, marked completed, skipped, skip reason

Pain values are **null when not reported**, never coerced to zero. Average before/after pain uses only days with **both scores**. An elevated after-session score or a discomfort report is only a review indicator, not a clinical diagnosis. Exercise events are patient-reported; they do not prove exercise performance.

Patient daily data is read-only in the Doctor portal. The new endpoint does not modify patient records or exercise unlock rules. No payment or bank details are included.

## Tests

Run `npm run test:doctor-patient-progress` in `backend/`.

Tests check owning-doctor access, invalid IDs, non-referred and other-doctor denial, empty/unreported pain values, preserved written feedback, and exercise events. The Deploy Readiness workflow runs these tests.

## Staging verification

1. Register a patient using Doctor A's QR and activate a programme.
2. Open Day 1 and submit scores, a written comment, difficulty, skip reason and discomfort.
3. Log in as Doctor A; navigate to My Patients > View progress. Verify the programme, chart, day details and flags.
4. Verify multiple programmes are selectable and their reports are not mixed.
5. Log in as Doctor B; attempting the same URL must return 404.
6. Verify direct/self-registered patients cannot be accessed through the doctor endpoint.
7. Verify a day without pain scores says *Not reported*, not *0/10*.
