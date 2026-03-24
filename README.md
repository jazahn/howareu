# howareu

A simple iOS app for daily mood check-ins. Log how you're feeling and track your responses over time in a Google Sheet stored in your own Google Drive.

## Features

- **Google OAuth login** — sign in with your Google account
- **Mood check-in** — answer "how are you?" (good / eh / bad) and select feelings from a randomized list
- **Google Sheets logging** — responses are recorded to a `data` spreadsheet in a `howareu` folder in your Google Drive
- **Check-in history** — view your last 7 responses in-app
- **Daily reminders** — optionally set a notification time to remind you to check in

## Prerequisites

- **Node.js** >= 20.x
- **Xcode** >= 16.x (for iOS builds)
- **EAS CLI** — `npm install -g eas-cli`
- **Expo account** — sign up at https://expo.dev
- **Apple Developer account** — required for App Store submission
- **Google Cloud Console project** with:
  - Google Sheets API enabled
  - Google Drive API enabled
  - OAuth 2.0 client IDs configured (web + iOS)

## Local Development

```bash
# Install dependencies
npm install

# Run on iOS simulator (requires native build for OAuth)
npx expo run:ios

# Run on web (limited — OAuth redirect may differ)
npx expo start --web
```

### Xcode 16.2 Build Fix

If you get Swift 6 / `@MainActor` / Sendable errors during native builds, apply these fixes after the `ios/` directory is generated:

1. **Patch the Podfile** — add to the `post_install` block in `ios/Podfile`:
   ```ruby
   installer.pods_project.targets.each do |target|
     target.build_configurations.each do |config|
       config.build_settings['SWIFT_VERSION'] = '5.0'
     end
   end
   ```

2. **Patch expo-modules-core** — remove `@MainActor` from protocol conformances:
   ```bash
   sed -i '' 's/extension UIView: @MainActor AnyArgument/extension UIView: AnyArgument/' \
     node_modules/expo-modules-core/ios/Core/Views/ViewDefinition.swift
   sed -i '' 's/ExpoView, @MainActor AnyExpoSwiftUIHostingView/ExpoView, AnyExpoSwiftUIHostingView/' \
     node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIHostingView.swift
   sed -i '' 's/extension ExpoSwiftUI.SwiftUIVirtualView: @MainActor ExpoSwiftUI.ViewWrapper/extension ExpoSwiftUI.SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper/' \
     node_modules/expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift
   ```

3. **Patch expo-notifications** — in `node_modules/expo-notifications/ios/ExpoNotifications/Notifications/DateComponentsSerializer.swift`, remove or comment out the `isRepeatedDay` block (requires iOS 26 SDK).

4. Re-run `cd ios && pod install`, then `npx expo run:ios --no-install`.

## Deploying to the App Store

### 1. Configure EAS

Make sure you're logged in to EAS and your project is linked:

```bash
eas login
eas init  # if not already initialized
```

The project is already configured in `eas.json` with Apple credentials.

### 2. Google Cloud Console Setup

Before submitting, ensure your Google OAuth consent screen is ready for production:

1. Go to [Google Cloud Console → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Fill in all required fields (app name, support email, developer contact)
3. Add the scopes your app uses:
   - `openid`
   - `profile`
   - `email`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`
4. **Submit for Google verification** — required for apps requesting sensitive scopes like Drive. This can take several days to weeks.
5. Once verified, publish the consent screen to production mode.

### 3. App Store Connect Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app if not already done:
   - Bundle ID: `com.jazahn.howareyou`
   - SKU: `howareu`
3. Fill in the app listing:
   - App name, subtitle, description
   - Keywords, category (Health & Fitness or Lifestyle)
   - Screenshots (required for each device size you support)
   - App icon (1024x1024)
   - Privacy policy URL (required)
   - Age rating
4. Under **App Privacy**, declare data usage:
   - Email address (from Google login)
   - Name (from Google login)
   - Usage data (mood responses)

### 4. Build for Production

```bash
eas build --platform ios --profile production
```

This will:
- Build the app in the cloud with production settings
- Handle code signing automatically (EAS manages certificates and provisioning profiles)
- Produce an `.ipa` file ready for submission

You'll be prompted for your Apple ID credentials on the first build.

### 5. Submit to App Store

```bash
eas submit --platform ios --profile production
```

Or combine build and submit:

```bash
eas build --platform ios --profile production --auto-submit
```

This uploads the build to App Store Connect using the credentials in `eas.json`:
- Apple ID: `family@jazahn.com`
- ASC App ID: `6760771879`
- Team ID: `9YU8AB2WTJ`

### 6. App Store Review

After submission:

1. Go to App Store Connect → your app → the new build
2. Add the build to your app version
3. Submit for review
4. Apple review typically takes 1-3 days
5. Common rejection reasons to watch for:
   - **Sign in with Apple** — Apple may require it if you offer Google sign-in. Consider adding it.
   - **Privacy policy** — must be hosted at a publicly accessible URL
   - **Data usage disclosure** — must match what you declared in App Privacy
   - **Google OAuth verification** — if Google hasn't verified your consent screen, login may fail for non-test users

### 7. TestFlight (Optional, Recommended)

Before submitting for full review, test via TestFlight:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Then in App Store Connect:
1. Go to TestFlight tab
2. Add internal testers (your team)
3. Or create a public link for external testers (requires brief Apple review)

## Project Structure

```
howareu/
├── App.js                          # Root component with screen navigation
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build & Submit config
├── package.json                    # Dependencies
├── index.js                        # Entry point
├── screens/
│   ├── LoginScreen.js              # Google OAuth sign-in
│   ├── HowAreYouScreen.js         # Main screen: quiz, history, menu
│   ├── SettingsScreen.js           # Notification reminder settings
│   └── ProfileScreen.js           # User profile display (unused)
└── assets/                         # App icons and splash screen
```

## Environment Notes

- Google OAuth client IDs are hardcoded in `LoginScreen.js` — move to environment variables for multi-environment setups
- The `ios/` directory is gitignored and regenerated on each build via `npx expo prebuild`
- Node_modules patches (for Xcode 16.2 compatibility) need to be reapplied after `npm install` — consider using [patch-package](https://github.com/ds300/patch-package) to automate this
