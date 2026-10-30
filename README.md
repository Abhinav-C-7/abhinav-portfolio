# Abhinav C — Portfolio

Personal site for Abhinav C, full-stack and React Native developer. Plain HTML, CSS and JavaScript: no build step, no framework.

## What's on the page

- **Hero** — "One person. Every layer." Move the cursor over the headline for the x-ray view of the stack.
- **The system** — an interactive map of TrainLabs. Pick a request (chat message, PDF import, video upload, subscription) and watch it travel through the mobile app, API, database and services.
- **Receipts** — real numbers from the TrainLabs codebase.
- **Also shipped** — Done-It, CourseCore, and the Attendance Management System contribution.
- **Paper** — IEEE NetACT 2025.
- **About + toolkit**, then a contact footer.
- Press **Ctrl K / ⌘K** anywhere for the command palette.

## Run it locally

```bash
python -m http.server 5317
```

Then open http://localhost:5317.

## Replace the placeholders

The photos in `assets/img/` are Pexels placeholders. Swap in your own files and keep the same names:

| File | Used for | Shape |
| --- | --- | --- |
| `portrait.jpg` | About section | portrait, about 4:5 |
| `done-it.jpg` | Done-It row | landscape, 4:3 |
| `coursecore.jpg` | CourseCore row | landscape, 4:3 |
| `attendance.jpg` | Attendance System row | landscape, 4:3 |

Photos are shown in a warm black-and-white treatment, so colour shots work fine.

Add your résumé as `resume.pdf` in the repo root. The footer and the command palette already link to it.

## Deploy

Any static host works. On Vercel: import the repo and deploy, with no build settings.

## Files

- `index.html` — content
- `tokens.css` — colours, type, spacing, motion tokens
- `styles.css` — layout and components
- `main.js` — x-ray hero, system map, command palette, copy-email
