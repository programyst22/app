# Android APK — OKA Bau OS

Workflow: `.github/workflows/build-apk.yml` (**Build OKA Bau OS APK**).
Push frontend changes to `main`, or run it from the Actions page.
The old workflow entry points call this same workflow and do not reapply the
original ZIP over subsequent fixes.

The workflow uses Node 22, Java 17, `npm ci`, TypeScript, redesign QA,
Expo Doctor, Android prebuild, and `./gradlew assembleDebug`.
JavaScript and assets are bundled into the debug-signed APK; developer-server
support is disabled for this build, so Metro is not needed on the phone.
CI verifies the APK signature and embedded bundle before uploading.

After a successful run, download **Artifacts → OKA-Bau-OS-APK**, unpack it,
and install **OKA-Bau-OS.apk**. The separate **APK-dependency-lock** artifact
records the dependencies used. Artifacts are retained for 30 days.

## Existing backend and notifications

- Set the Actions secret or variable `EXPO_PUBLIC_BACKEND_URL` to the existing
  deployed backend base URL. The fallback preserves the preview endpoint
  already referenced by the repository's backend tests; its availability has
  not been verified. No backend deployment is performed by this workflow.
- Optionally set `GOOGLE_SERVICES_JSON` to the Firebase Android configuration
  matching `com.emergent.okabuildplatform.hpgnts`. Without it the APK can build,
  but Android remote push registration requires Firebase configuration.
- Backend code, authentication API and role-based routes remain in place.
- This is a debug-signed APK for device testing, not a Play Store release.

## Verification status

Local TypeScript, redesign QA, Expo Doctor (20/20), Android prebuild and
Android JavaScript export have passed. This does not replace a successful
GitHub Actions Gradle build or a device installation test.
