# General Knee Pain (30 days): 15 different exercise video candidates

**Clinical status:** External educational video *candidates*, not reviewed
PhysioQR rehabilitation prescriptions. No patient publishing occurs.

## Why we changed this

Previously the same sample YouTube video was added to every exercise, which
made the Knee 30-day programme's 15 exercise rows look identical. This change
maps **one different exercise-matched video per reusable Knee exercise**.
When that exercise recurs on several of the 30 days, it appropriately reuses
the same demonstration; day-specific sets/repetitions remain unchanged.

Most videos are linked from [Kingston & Richmond NHS Foundation Trust's Knee
Exercises](https://www.kingstonandrichmond.nhs.uk/services/service-search-z/physiotherapy-msk-richmond).
Additional specifically titled videos are linked from named organisations.
Discoverable titles and sources do not mean the PhysioQR clinical team has
watched the full video, confirmed embedding/reuse permission or approved its
technique, progression, diagnosis-specific relevance or patient suitability.

| Draft exercise key | Candidate demonstration | Source |
| --- | --- | --- |
| quad_set | https://youtu.be/26hnV630E3Q | Kingston & Richmond NHS |
| heel_slide | https://youtu.be/c-gRSlCfNZE | MSK Medicine |
| seated_extension | https://youtu.be/HB0hHrXwImI | The Rotherham NHS Foundation Trust |
| straight_leg_raise | https://youtu.be/cohSTgZKJjs | Kingston & Richmond NHS |
| heel_raise | https://youtu.be/Ud_VaRFGRsY | Kingston & Richmond NHS |
| hamstring_curl | https://youtu.be/k4TDxANOD4M | Kingston & Richmond NHS |
| hip_abduction | https://youtu.be/9f7KVxlNe7A | Kingston & Richmond NHS |
| sit_to_stand | https://youtu.be/-w4DXEG-E7M | Kingston & Richmond NHS |
| mini_squat | https://youtu.be/nKf8HIHJv2E | Kingston & Richmond NHS |
| step_up | https://youtu.be/wOoGczWEUoE | Kingston & Richmond NHS |
| weight_shift | https://youtu.be/LUd57n5RGTA | Vital Rehab Physical Therapy |
| tandem_stance | https://youtu.be/qcYMv5dDr44 | Kingston & Richmond NHS |
| bridge | https://youtu.be/WK-5Pb9nNwQ | Kingston & Richmond NHS |
| calf_stretch | https://youtu.be/uuVyVuSbXrA | NHS inform |
| hamstring_stretch | https://youtu.be/Cg6sXCuvgyw | SOS Physiotherapy |

## Using in development

Pull latest `main`, then in `backend` with correct development `MONGO_URI`:

```powershell
npm run knee:video-candidates
npm run knee:video-candidates:apply
npm run test:knee-video-candidates
```

The preview is read-only. The **apply** command updates only the 15 records
with `seedKey` beginning `physioqr_knee_general_30d_` that belong to the
inactive `DRAFT-KNEE-GENERAL-30D` programme. It fills blank links and
replaces the exact previous PhysioQR generic testing URLs. It never
overwrites a real/custom linked video. It is safe to rerun.

Alternative: **Admin → Exercises → 15 unique Knee videos → Confirm**.
This calls the running backend's connected development database.

This does not affect post-operative Knee/Shoulder or other programmes.

## YouTube-only video links

The Exercise Library stores an exercise's **direct YouTube URL** and its
matching 11-character YouTube video ID; hosted file uploads are not required.
The physiotherapist can review the linked demonstrations in the one
General Knee 30-day programme sign-off.

For an exercise-specific candidate, a separate `videoCandidateSourcePage`
field is **optional**. A valid HTTPS `youtube.com` or `youtu.be` URL with a
matching saved video ID is sufficient for the video-link check at sign-off.
The link must be reviewed for exercise suitability, and a generic
playback-testing URL (e.g. `ml6cT4AZdqI`) remains ineligible.

If the sign-off popup fails now, it reports the **exercise name and video
problem**, e.g. a mismatched URL/video ID. In Admin → Exercises → Manage → Edit,
re-save that exercise's YouTube URL and retry. No exercise-specific
approval form is needed; programme sign-off is recorded separately.

## Review and release process

- Each candidate is saved `isDemoVideo=true` AND
  `videoCandidateReviewPending=true`, with the provider's name/title/source.
  That means **pending clinical review**, not an irrelevant generic demo.
- Candidates can be opened in Admin Exercise Detail for review. They are
  hidden from patient video APIs and never count as a ready clinical video.
- **No separate video-by-video sign-off form.** A qualified physiotherapist
  reviews the complete 30-day programme (including each linked demonstration,
  exercise technique, instructions and safety) once. Admin → Programmes →
  Knee 30-Day → **Record clinical sign-off** records the real reviewing
  physiotherapist's name and review note. Only that explicit full-programme
  action marks its 15 mapped video candidates as reviewed and audit-logs the
  sign-off. It does NOT automatically publish the programme.
- Editing candidate metadata does not silently approve a video. Changing a
  previously reviewed video invalidates its review; the whole programme must
  be re-reviewed before publication.
- The Knee programme still requires all 30 days, valid exercise content,
  active exercises, a single qualified clinical sign-off, and separate
  deliberate Admin publication.
- External videos may block embedding or change after being linked. The
  clinical team must check rights, video accessibility, technique and
  instructions before approving. Prefer owned/licensed exercise video content
  for production.

The **generic** Admin "Add Demo YouTube URLs" button still exists for
other content-testing scenarios; do not use it for this specific Knee mapping.
No data is automatically written to your local MongoDB just because GitHub
code was committed.
