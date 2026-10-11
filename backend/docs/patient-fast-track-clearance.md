# Patient assessment — safe fast-track onboarding

Goal: patients without clinical risk should NOT wait for an Admin to manually
approve every assessment. Rehab programmes also should not be delivered
automatically to patients whose answers signal urgent or post-operative risk.

## Assessment outcome

| Assessment | Status | Patient journey |
|---|---|---|
| Non-surgical, no red flags, no configured physio-review requirement | `cleared` immediately | Continue to matched **published** programme and payment |
| Any red flag, including only **one** | `pending_review` | Pause programme/payment; show clinical safety review |
| Post-operative pathway | `pending_review` | Pause programme/payment for post-operative clearance |
| Any pathway deliberately configured to require clinician review | `pending_review` | Pause for clinician review |
| Clinician already cleared an earlier pending assessment | `cleared` | Resume programme/payment; don't re-block because `hasRedFlag` remains in history |
| Clinician blocked assessment | `blocked` | No rehabilitation programme/payment while blocked |

**Never apply a ">2 red flags" rule:** a single high-risk response can be
medically serious. Red flags are clinical triggers, not a vote/count threshold.

## Programme selection

Normal, cleared non-operative assessments use the standard body-region-matched
active programme. **Prior red-flag or mandatory physio-review cases** only
continue with a clinician-selected active programme after the assessment is
cleared.

A missing published programme or unavailable quote is not clinical approval
waiting: patient sees an explicit content/configuration unavailable message
instead of an indefinite spinner or a false promise.

## Separate one-time content publishing

The Admin **Record clinician's approval** modal shown in the 30-Day General
Knee programme is a **programme-content safety gate**, not an approval required
for each new patient. The 15 linked external exercise-video candidates and
full 30-day content must receive genuine clinical review once, and the
programme must be deliberately published. It does not make sense to auto-sign
this audit on the basis of a patient's answers.

After the published programme is active, eligible normal patients may be
automatically assigned to it without additional individual Admin approval.

## Backend verification

```powershell
cd D:\jurnary\PhysioQR\backend
npm run test:patient-auto-clearance
```

Also verify in a staging browser:
1. Pain/Injury (MSK), 0 red flags → instant Programme step, no Admin approval.
2. Pain/Injury with one red-flag answer → review before payment.
3. Post-Surgery with 0 red flags → clinical review before payment.
4. Manually clear a pending review and assign a programme → on login the
   patient can resume to Programme/Payment.
5. Block an assessment, then log in → payment and rehabilitation stay blocked.
6. Have a pre-existing active programme but a newer pending assessment →
   pending review takes precedence over old dashboard state.
7. No matching active/published programme → no payment and a clear availability
   explanation.

Old assessment histories and programme approvals are unchanged. This is not
a bulk auto-clear migration for existing pending-risk assessments.
