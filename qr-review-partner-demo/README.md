# QR Review System — Partner Demo

Functional frontend prototype for the QR/NFC customer review flow.

## What works
- 1–5 star rating
- Up to 4 contextual chips
- Restaurant/menu-specific chips
- Optional manual feedback
- Enhance option for typed text
- Local zero-cost review generation
- Regenerate / edit / copy
- Copy & continue to Google
- Responsive mobile-first UI

## Important demo note
This prototype intentionally uses local review-generation logic, so it requires no AI API key, backend, login, or paid credits. Production can replace the generator with a rate-limited backend call to a lightweight AI model.

The current Google action opens Google Maps as a safe demo placeholder. In production it should use the saved Google review URL for the exact merchant location.

## Run
Download `index.html` and open it in a modern browser. No build step is required.

## Git branch
`qr-review-partner-demo`

The demo is isolated from the main PhysioQR branch and does not modify the existing application flow.