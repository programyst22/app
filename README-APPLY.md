# OKA Bau OS — Fazora-style redesign patch

This patch is designed for the existing repository:
https://github.com/programyst22/app

## What it changes

- Switches the public visual system to Inter 400–800.
- White / #111 premium design language.
- Black primary buttons.
- Hugeicons Stroke Rounded (1.5px).
- Full-screen real OKA Bau hero video from https://oka-bau.eu/assets/hero.mp4.
- Staggered reveal system and word-by-word headings.
- Responsive public Home inspired by the Fazora layout, but using ONLY OKA Bau content.
- No fake testimonials, fake statistics, fake staff, or fake properties.
- Keeps all existing backend, CRM, auth, client, employee, admin and 3D functionality.

## Replace/add these files in the repository

- frontend/package.json
- frontend/src/theme.ts
- frontend/app/_layout.tsx
- frontend/app/+html.tsx
- frontend/app/(tabs)/index.tsx
- frontend/app/(tabs)/mein-projekt.tsx
- frontend/app/admin/projects.tsx
- frontend/app/admin/more.tsx
- frontend/app/admin/list/[entity].tsx
- frontend/app/admin/project/[id].tsx
- frontend/app/admin/lead/[id].tsx
- frontend/src/components/project-sections.tsx
- frontend/app/employee/project/[id].tsx
- frontend/app/client/offer/[id].tsx
- frontend/app/client/chat/[id].tsx
- frontend/app/client/project/[id].tsx
- frontend/app/admin/crm.tsx
- frontend/app/admin/index.tsx
- frontend/app/admin/_layout.tsx
- frontend/app/employee/index.tsx
- frontend/src/components/premium.tsx  (new)

Then run in frontend:

    yarn install
    npx expo start

## Important

The current ChatGPT GitHub connection can read the repository but the GitHub integration returned HTTP 403 for code writes.
So this ZIP is a ready-to-apply patch. Once GitHub write access is enabled, the same files can be committed directly.

## Next implementation phase

1. Full repository integration test: overlay this patch on the original source tree.
2. Run TypeScript, Expo lint, Expo Doctor, web build, responsive and accessibility checks.
3. Fix any integration-level import/type issues discovered only with the complete repository.
4. Run E2E role flows (client / employee / manager / admin), CRM conversion, documents, offers, invoices, chat and Bautagebuch.
5. Prepare production deployment configuration and Firebase push credentials.

## V6 validation completed

- All 20 TypeScript/TSX files contained in this patch pass TypeScript parser/transpile syntax validation.
- Direct legacy `Ionicons` imports and `icon="..."` props are absent from the patch files.
- Full type resolution, Expo lint/Doctor, build and E2E still require the complete original repository with its unchanged files and installed dependencies.

## Android APK build

- `.github/workflows/build-android-apk.yml` builds an installable Android APK in GitHub Actions.
- `frontend/eas.json` also supports Expo EAS preview APK builds.
- See `APK-BUILD.md`.
