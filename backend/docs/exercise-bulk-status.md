# Exercise Library: quick status and bulk actions

Admin users can change exercise lifecycle status without retyping the same
audit reason for each action. This affects the reusable exercise library; it
**does not** certify technique, add videos, approve a programme or publish
content to patients.

## Single exercise
- Admin → Exercises → Manage → Reactivate / Deactivate.
- Read the confirmation, then select Confirm.
- The backend records the authenticated Admin, timestamp, request and
  a standard status-change reason in the Audit Log automatically.

## Many exercises
1. Open Admin → Exercises. Select **Inactive** for the draft Knee exercises.
2. Check individual rows, or **Select all on this page**. Selection is limited
   to the currently visible page so hidden/off-page exercises are not changed.
3. Choose **Activate selected** or **Deactivate selected**.
4. Review the count, video warning and status consequences.
5. Optionally enter **one shared reason**, then confirm once.
6. A success message reports changed vs already-in-target-state counts.
7. If the filtered list is now empty, switch Status to **All** or **Active**.

API: `POST /api/exercises/bulk-status`, Admin-only:
```json
{
  "exerciseIds": ["507f1f77bcf86cd799439011"],
  "action": "activate",
  "reason": "Optional common note"
}
```
- 1–100 valid unique IDs; no implicit `all records` bulk operations.
- Requires all provided IDs to exist before changing any.
- Existing matching statuses are skipped.
- Each changed exercise gets an individual attributed audit entry.
- If reason is blank, the backend uses a standard action reason.
- API returns `{selected, changed, skipped, programmePublished:false}`.

## Safety boundaries

**An exercise being Active is not proof of a reviewed video.** The General Knee
30-day clinical draft remains unpublished until every required day/exercise
passes programme readiness (including a real video URL), a qualified
physiotherapist reviews it, and Admin records actual clinical sign-off.
Programme publication is a separate audited action. This bulk endpoint never
modifies `Program.isActive` or any `clinicalApproval`.

Run regression tests from `backend`:
```sh
npm run test:exercise-bulk-status
npm run test:knee-general-30d-draft
```
