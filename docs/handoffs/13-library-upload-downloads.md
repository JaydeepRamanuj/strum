# Handoff — Upload and Downloads inside Library

**Date:** 2026-11-27
**Phase doc:** docs/phase-9-offline-downloads.md (section "Deviations made after building")
**Status:** Complete
**Last commit:** 16acbe5 phase-9: move Upload and Downloads into Library, show Downloads on Home only offline (this handoff is committed right after it)

## What was built
- **Navigation** (`src/components/layout/navItems.ts`, `BottomTabBar.tsx`, `Sidebar.tsx`): Upload and Downloads no longer have tabs. Mobile tab bar: Home, Search, Discover, Library. The "uploads in progress" badge moved to the Library tab.
- **Library** (`src/features/library/LibraryPage.tsx`): **Upload** button in the header (with the progress badge), and a third view **Songs · Playlists · Downloads** (`?view=downloads`).
- **Downloads view** (`src/features/offline/DownloadsList.tsx`, was `DownloadsPage.tsx`): same list, play all, shuffle, remove all, storage used. `/downloads` redirects to `/library?view=downloads`; the offline banner and the offline "Listen" prompt open it.
- **Home** (`HomePage.tsx`): the Downloads card shows only while offline (phones and desktop). The Top songs card stays on phones.
- Tests: 243 passing (new: Upload/Downloads reached from Library with no nav link, `/downloads` redirect).

## Acceptance criteria
- [x] No Upload or Downloads tab; both reachable from Library — `AppRoutes.test.tsx`
- [x] Old `/downloads` link still works — `AppRoutes.test.tsx`
- [x] Lint, build, tests pass (tests with dummy `VITE_*` values)
- [ ] Library header and the three-way toggle fit on a 375px phone — needs owner verification (couldn't sign in here to look)
- [ ] Home shows the Downloads card when offline and hides it when back online — needs owner verification

## Deviations from plan
- Written into `docs/phase-9-offline-downloads.md`, plus the tab list note in `docs/phase-0-setup.md` and the root `README.md`.

## Deferred / known issues
- The mobile tab bar has a free slot now; Top songs could take it (Home would then drop its Top songs card). Not done; owner's call.

## Owner action needed
- Look at Library on your phone (header buttons, toggle) and try airplane mode on Home.
- Pending owner actions from handoffs 11 and 12 still apply.

## How to run
- `npm run dev` · `npm run lint` · `npm run build` · `npm run test`

## Next phase
- None planned. Ideas are under "After launch" in `docs/phase-5-pwa-deploy.md`.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/13-library-upload-downloads.md
4. All planned phases are built. Work on the owner's next request. If it is a new feature, write a phase doc under docs/ first.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the work is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
