# Lebse mobile

Expo Android/iPhone container for the same responsive marketplace. Account cookies stay in the platform WebView and are never copied into JavaScript or native token storage. All purchasing, reports, addresses, offers, drafts and profiles use the existing server. This is a hybrid mobile app, not a rewrite of every screen in React Native.

## Local development

Install this folder’s dependencies with its lockfile, then `pnpm start`. Try Expo Go before making a custom build. Android and iPhone JavaScript bundles can be verified with `pnpm export`; `pnpm check` checks types. Metro does not host the marketplace API.

The local backend remains bound to your computer’s loopback interface. For a USB-connected Android device with Android platform tools installed, run `adb reverse tcp:5173 tcp:5173`, keep the root marketplace running, and use `EXPO_PUBLIC_MARKETPLACE_URL=http://127.0.0.1:5173`. Use `adb reverse tcp:8081 tcp:8081` if starting Metro on localhost. Do not expose this test backend or sample credentials publicly. iPhone testing requires a reachable, reviewed HTTPS environment or a simulator on the same Mac as the local marketplace.

## Internal phone builds

Set `EXPO_PUBLIC_MARKETPLACE_URL` to the reviewed HTTPS marketplace origin. Sign into your own Expo account, run `eas init`, confirm the app identifiers and configure the environment variable for the build. `pnpm production:apk` produces an internally distributable production-configured APK; `pnpm production:aab` produces the Google Play bundle. Use the APK for invited device testing and the AAB for Play Store submission. These commands upload the mobile project to Expo and are not run automatically by Lebse. Store accounts, signing credentials, a live service and store review are separate release requirements. No signed APK/IPA is implied by a successful JavaScript export.

The app allows navigation only within the configured origin. External HTTPS links opened in a separate window go to the system browser; other URL schemes are blocked. No location or microphone permission is requested. WebViews use the operating system’s file picker for photos; camera and photo permission prompts must be tested on real devices. Do not store API keys in EXPO_PUBLIC variables.

Real email/SMS verification, payment, courier and payout providers remain unconnected in the underlying local marketplace. Build configuration deliberately refuses a non-HTTPS origin for remote builds.

References: [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/), [Android APK builds](https://docs.expo.dev/build-reference/apk/), [internal distribution](https://docs.expo.dev/build/internal-distribution/).
