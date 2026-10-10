# General Knee Pain — 30-day clinical draft

**Status:** DRAFT / NOT PATIENT-VISIBLE / NOT CLINICALLY APPROVED

This repository includes an idempotent seed of **15 reusable exercise records,
30 unique programme days, and 112 programme-day exercise assignments**.
It is a clinician-editable starting template for non-operative, non-acute
general knee discomfort, **not** a diagnosis-specific prescription or
post-operative rehabilitation protocol.

## Evidence and intended use

Exercise categories (quadriceps, hamstrings, hip and calf strength;
mobility, safe balance, supported everyday function) were informed by:
- [AAOS: Knee Conditioning Program](https://orthoinfo.aaos.org/en/recovery/knee-conditioning-program/)
- [NHS Inform: Exercises for knee problems](https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/leg-and-foot-problems-and-conditions/exercises-for-knee-problems)
- [NHS: Knee pain / urgent symptoms](https://www.nhs.uk/symptoms/knee-pain/)

The **specific 30-day ordering and per-day sets/reps are draft editorial
suggestions**, not a claim that these organisations endorse this exact schedule.
A qualified clinician must decide suitability, dosage, days to rest,
progression and exercise substitutions after evaluating the individual.

Do not use for knee replacement, ligament reconstruction, recent knee surgery,
acute injury, inability to weight-bear, a markedly swollen/hot/red knee,
locking, giving-way or other urgent symptoms. When symptoms worsen or new pain
occurs, stop and seek clinical review. Do not automatically advance by date.

## Source and MongoDB mapping

- Programme code: `DRAFT-KNEE-GENERAL-30D`
- Body region: existing active `Knee` / `Knee Pain` / `Knee Joint`
- Program: `isActive=false`, `clinicalApprovalRequired=true`
- Exercises: `isActive=false`, `videoUrl=''`, `youtubeVideoId=''`
- ProgramDay: numbered 1 through 30, `focus` note, ordered exercise links
- Day-specific `sets`, `repetitions`, `holdDuration`, `restDuration`
  override the reusable Exercise defaults when shown to a patient

Nothing is silently published. Existing `AUTO-KNEE-REHAB-*`,
post-operative programmes, historical enrolments and payments are untouched.

## How to preview, seed and inspect

From `backend` with installed npm dependencies:

```sh
npm run validate:knee-general-30d-draft
npm run test:knee-general-30d-draft
```

Only when connected to the intended backend MongoDB database via `MONGO_URI`:

```sh
npm run seed:knee-general-30d-draft
```

The seed is insert-only for this programme code and its seeded exercises/days.
It refuses to modify an already active programme or overwrite existing Admin
changes. It is safe to re-run after interruption, but must not be used to
replace clinical edits.

Admin steps (the Programme screen now shows a 3-step guided checklist):
1. Open **Admin → Programmes** and search `DRAFT-KNEE-GENERAL-30D`.
2. Open its detail screen and inspect **all 30 day cards** and prescriptions.
   The readiness checklist groups repeated per-day warnings by **unique exercise**.
   The initial draft has 15 distinct exercises, reused across 112 day-exercise
   assignments. In the initial state these generate 224 assignment-level
   warnings: 112 inactive exercise assignments + 112 missing-video assignments.
   Click **Edit exercise** on any checklist row to open its exercise record.
   After saving, click **Back to programme checklist** to return.

3. Open **Admin → Exercise Library** to review exercise technique, safety,
   progression and equipment, attach real clinician-approved YouTube videos,
   then activate each reviewed exercise as appropriate.
4. Use **Recheck readiness** in the Programme checklist after adding the
   real videos and marking clinically reviewed exercises active. All 15 unique
   exercise rows must be ready, all 30 days present and all additional
   configuration issues resolved.
5. Only after an actual physiotherapist has reviewed the complete content,
   click **Record clinical sign-off** and enter clinician name + review note.
   This records the Admin account and sign-off in the audit log.
6. Separately use **Publish after approval**. The backend rejects publication
   unless sign-off is recorded, every day is configured, every exercise is
   active, has a video and safety instructions, and the sign-off is still fresh.
7. Verify patient assessments, programme selection, payment/access, all day
   videos and progress tracking in staging before production.

If an exercise or day changes after signing off, renewed clinical review is
required. Only after programme activation can new eligible patients be
assigned to this specific programme by the normal clinical/purchase workflow.

## Important system limitations

- This seed **does not generate or source any videos**.
- No video link is a placeholder; blank means not recorded.
- This workflow does not insert videos or claim clinical approval on behalf of
  a clinician. The UI records genuine human sign-off, not auto-sign-off.
- The programme is separate from existing active `AUTO-KNEE` shells. An
  existing active shell can still be chosen by old automatic matching;
  review existing active programmes and their readiness independently.
- Patient programme eligibility is currently by body region, not a full
  diagnosis-specific rules engine. Clinicians must assess suitability.
- Existing programme data is not retroactively changed.
- Day-based automated progression is not a substitute for individual
  symptom-based clinical review.
