# OKA BAU OS — REDESIGN INTEGRATION QA

## PASS
- V6/V7 premium design files parse as TypeScript/TSX.
- Inter font tokens are used by the redesigned screens.
- Hugeicons dependencies are declared.
- Direct Ionicons usage was removed from the premium patch files.
- Admin Lead Detail and Admin Project Detail were audited against the current repository API/UI contracts.
- Existing CRM/project/client/employee flows were preserved rather than replaced with fake UI.
- A deterministic local integration checker is included: `frontend/scripts/qa-redesign.cjs`.
- A safe overlay helper with automatic backup is included: `APPLY-TO-REPO.sh`.

## FIXED IN V7
- Missing `ArrowRight01Icon` import in `PremiumHeader`.
- Typing-indicator TypeScript inference issue in realtime project chat.
- Added `typecheck` and `qa:redesign` scripts.
- Added dependency/file presence checks before a production build.

## ACTION REQUIRED
- The execution container cannot reach github.com/npm directly, so a complete clone plus dependency installation cannot be performed inside this session.
- After overlaying V7 onto the complete repo, run:
  1. `yarn install`
  2. `yarn qa:redesign`
  3. `yarn typecheck`
  4. `yarn lint`
  5. `npx expo-doctor`
- Firebase `google-services.json` is still required for real Android push delivery.
- Production environment values such as `EXPO_PUBLIC_BACKEND_URL` must be configured outside source control.

## E2E
- Static integration audit: PASS
- Full runtime E2E on a complete installed repository: ACTION REQUIRED
