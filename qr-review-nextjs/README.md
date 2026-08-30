# QR Review Partner Demo — Next.js

Senior-level partner demo for the QR Review System.

## Included flow

- 1–5 star rating
- Contextual retail chips (max 4)
- Optional manual note
- Local "Enhance" action
- Local review generation for zero API cost in demos
- Edit and regenerate review
- Copy review
- Direct Google Write-a-review handoff for Mangal Traders
- Responsive mobile customer experience
- Desktop partner presentation panel

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production integration

Replace local generation in `lib/review.ts` with a backend AI route. Keep the public customer path lightweight and keep the final Google action user-controlled.
