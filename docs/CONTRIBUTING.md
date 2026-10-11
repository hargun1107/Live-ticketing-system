# Contributing / Git Workflow

## Branches

```
main          -> always deployable / demo-ready
development   -> integration branch, merge feature branches here first
feature/auth      -> Developer 1
feature/frontend  -> Developer 2
feature/events     -> shared, whoever's touching events/venues
feature/booking    -> Developer 3
feature/admin      -> shared
feature/database   -> Developer 3
```

## Day-to-day flow

1. `git checkout development && git pull`
2. `git checkout -b feature/<your-area>`
3. Commit small, focused changes with clear messages:
   `git commit -m "feat(booking): add seat lock transaction"`
4. Push and open a PR **into `development`**, not `main`.
5. At least one other teammate reviews before merging.
6. Periodically merge `development` into `main` once it's stable and demoed.

## Minimizing merge conflicts (by design)

The project structure already separates responsibilities into files
that don't overlap much:

- **Developer 1 (Backend/Auth)** mainly touches: `backend/src/controllers/authController.js`,
  `backend/src/middleware/auth.js`, `backend/src/utils/authUtils.js`, `backend/src/routes/authRoutes.js`.
- **Developer 2 (Frontend/UI)** mainly touches: `frontend/src/components/*`,
  `frontend/src/pages/*`, `frontend/src/index.css`.
- **Developer 3 (Database/Booking/Admin)** mainly touches: `database/*`,
  `backend/src/services/bookingService.js`, `backend/src/controllers/bookingController.js`,
  `backend/src/controllers/adminController.js`.

Guidelines:
- Don't reformat files you didn't write changes in — this creates
  noisy diffs and conflicts for no reason.
- If two of you need to touch the same file (e.g. `server.js` to add
  a new route), do it in small, separate commits and pull before you push.
- Keep `App.jsx`'s route list and each route file focused — adding a
  new page is usually a 2-line addition, not a rewrite.
- Run `npm run build` (frontend) and start the backend locally before
  pushing to `development`, to catch obvious breakage early.

## Commit message convention (optional but recommended)

```
feat(scope): short description
fix(scope): short description
docs(scope): short description
refactor(scope): short description
```

Example: `feat(seats): add live polling to refresh seat map every 10s`
