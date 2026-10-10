# Exercise YouTube playback test URL — development only

**Requested sample URL:** https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z

This user-supplied URL is used for **playback testing**, not as a verified
exercise-specific physiotherapy tutorial. It is intentionally marked
`isDemoVideo=true`, excluded from patient video responses and NOT considered
valid clinical content in the programme publication gate.

## Correct way to insert URLs

Pull the latest `main`. In the backend folder, with the **development**
`MONGO_URI` and `NODE_ENV=development`:

```powershell
npm run demo:exercise-videos
npm run demo:exercise-videos:apply
npm run test:demo-exercise-videos
```

The first command is **read-only preview**. The second actually inserts the
sample into exercises that have no URL/ID and upgrades the previous PhysioQR
sample `M7lc1UVf-VE` (if it was installed and flagged as demo). Real
exercise-specific video links are NEVER overwritten. Running it again is safe
and won't change records that already contain the requested sample.

**Why the older command did not work:** On some npm/PowerShell combinations,
`npm run demo:exercise-videos -- --apply` did not forward `--apply` to Node,
so the script reported `PREVIEW ONLY`. The new
`demo:exercise-videos:apply` script contains the argument explicitly.

**Alternative one-click Admin action:** Admin → Exercises → **Add Demo
YouTube URLs** → Confirm. It uses the *same database as the running backend*
and updates blank/previous-demo exercises. In a non-production environment
only.

## Remove sample URLs

```powershell
npm run demo:exercise-videos:remove
```

This removes only **exactly matching, flagged** PhysioQR demo URLs (both
the requested and original sample). Exercise-specific real URLs remain saved.

## Safety and release

- No exercise is activated by this operation.
- No clinical sign-off or programme publication occurs.
- Real videos and patient records are unchanged.
- Both the original and requested demo IDs are recognized as testing links.
- Admin sees a testing-only warning; patients will not be shown these links.
- The Knee 30-Day Programme remains clinically locked until unique, relevant,
  clinician-reviewed exercise videos and actual physiotherapist approval exist.
- Production mode (`NODE_ENV=production`) explicitly rejects the demo operation.
- A matching YouTube ID does not prove a video's exercise relevance or safety.
