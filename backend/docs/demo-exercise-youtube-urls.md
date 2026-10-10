# Demo YouTube videos for exercise-player TESTING ONLY

**Never publish a clinical rehabilitation programme using these sample videos.**
The demo URL is YouTube's IFrame API sample:
`https://www.youtube.com/watch?v=M7lc1UVf-VE`
(see Google Developers' IFrame Player API documentation).
It demonstrates embedded playback, not physiotherapy technique.

## Safe workflow

In `backend`, with `MONGO_URI` configured for your **development** database:

```sh
npm run demo:exercise-videos
```

This is a read-only preview: it prints how many exercise records have no
video metadata and would get a demo link.

To apply once in development:

```sh
npm run demo:exercise-videos -- --apply
```

This fills **all existing exercises with neither `videoUrl` nor
`youtubeVideoId`**, whether active or inactive; no existing real video is
overwritten. Saved records get `isDemoVideo=true` and the demo YouTube ID.
Running the command again is idempotent. It changes no active/inactive status,
patient data, programme approval, or programme publication. The script REFUSES
to run if `NODE_ENV=production`.

To remove only these exact demo links later:

```sh
npm run demo:exercise-videos -- --remove
```

This only cleans records still marked with the sample URL and ID. A real
video installed through Admin → Exercise Edit is not removed.

## User interface and safety

- Admin Exercise Library and Exercise Detail display **Demo — Testing Only**.
- The programme readiness checklist says **Demo video — replace with real exercise video**.
- The release gate refuses to count sample links as a valid clinical video
  even if the exercise is active and its ID looks like a normal YouTube video.
- Patient exercise listing/detail, programme days, prescription and daily
  progress content do **not** return demo YouTube URLs to non-Admin users.
- When Admin replaces a sample URL with a proper YouTube exercise video,
  `isDemoVideo` automatically resets to false. Qualified clinician review,
  actual video suitability and manual clinical sign-off are still required.

Remember: a URL's YouTube format does not itself establish that the video
is medically relevant, safe, authorised or even publicly accessible.

Test:

```sh
npm run test:demo-exercise-videos
npm run test:knee-general-30d-draft
```
