# 🧪 Local Testing Guide for TiltGuard

## Prerequisites

Before you start, make sure you have:
- **Node.js 18+** installed
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli` or `npm install -g @expo/cli`
- A **Firebase project** (free tier is fine)

For device testing:
- **iOS**: Mac with Xcode installed, or use Expo Go app on iPhone
- **Android**: Android Studio with emulator, or use Expo Go app on Android phone
- **Web**: Any modern browser (works immediately, no setup needed)

---

## Step 1: Install Dependencies

```bash
cd /home/user/TiltGuard
npm install
```

This will install all dependencies including:
- React Native packages
- Firebase SDK
- RevenueCat SDK (will work in simulated mode without configuration)
- Expo Router

---

## Step 2: Configure Firebase

### A. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Name it "TiltGuard" (or anything you prefer)
4. Disable Google Analytics (optional)
5. Click "Create project"

### B. Enable Authentication

1. In Firebase console sidebar, click **Authentication**
2. Click "Get Started"
3. Go to "Sign-in method" tab
4. Enable **Email/Password** provider
5. Click "Save"

### C. Enable Firestore Database

1. In Firebase console sidebar, click **Firestore Database**
2. Click "Create database"
3. Choose **"Start in test mode"** (for development)
4. Select a region (us-central1 is fine)
5. Click "Enable"

### D. Get Your Firebase Configuration

1. In Firebase console, click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Register app with nickname "TiltGuard Web"
5. Copy the `firebaseConfig` object

### E. Add Config to Your App

Open `src/config/firebase.ts` and replace the placeholder with your actual config:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### F. Deploy Firestore Security Rules

1. In Firestore console, go to the **Rules** tab
2. Copy the contents of `/home/user/TiltGuard/firestore.rules`
3. Paste into the Firebase rules editor
4. Click **"Publish"**

---

## Step 3: Run the App

### Option A: Web (Fastest for Testing)

```bash
npm start
# When the dev server starts, press 'w' for web
```

Or directly:
```bash
npm run web
```

The app will open in your browser at `http://localhost:19006`

**Note**: RevenueCat purchases won't work on web, but everything else will!

### Option B: iOS Simulator (Mac Only)

**Prerequisites**:
- Xcode installed from App Store
- iOS Simulator set up

```bash
npm start
# Press 'i' for iOS simulator
```

Or directly:
```bash
npm run ios
```

### Option C: Android Emulator

**Prerequisites**:
- Android Studio installed
- Android emulator configured

```bash
npm start
# Press 'a' for Android
```

Or directly:
```bash
npm run android
```

### Option D: Physical Device (Easiest!)

1. Install **Expo Go** app on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. Run the dev server:
```bash
npm start
```

3. Scan the QR code:
   - iOS: Use Camera app to scan QR code
   - Android: Use Expo Go app to scan QR code

---

## Step 4: Test the App

### Create Test Account

1. In the app, tap **"Create Account"**
2. Enter email: `test@test.com`
3. Password: `password123`
4. Weekly budget: `$150`
5. Weekly loss limit: `$100`
6. Tap "Complete Setup"

### Test Basic Flow

1. **Add a bet**:
   - Tap "Add New Bet"
   - Amount: $20
   - Odds: -110
   - Sport: NFL
   - Tap "Add Bet"

2. **Settle a bet**:
   - Tap on the bet in recent bets
   - Tap "Loss" or "Win"
   - Check that stats update

### Test Tilt Triggers

**LOSS_STREAK Trigger** (easiest to test):
```
1. Add 3 bets (any amounts)
2. Settle all 3 as "Loss"
3. Try to add a 4th bet
4. ✅ TiltGuard modal should appear!
```

**DRAWDOWN Trigger**:
```
1. Make sure weekly loss limit is $100
2. Add a $40 bet and settle as "Loss"
3. Add another $40 bet and settle as "Loss"
4. Try to add another bet
5. ✅ TiltGuard modal should appear (at 80%)
```

**SESSION Trigger**:
```
1. Add 5 bets quickly (don't settle them)
2. Try to add a 6th bet within the same hour
3. ✅ TiltGuard modal should appear
```

### Test Upgrade Flow (Simulated)

1. In TiltModal or Patterns screen, tap **"Upgrade to Pro"**
2. See the upgrade screen with pricing
3. Select Monthly or Yearly plan
4. Tap purchase button

**Note**: Without RevenueCat configured, purchases will show an error. The screen and UI still work for testing.

---

## Common Issues & Solutions

### Issue: "Firebase not configured" error

**Solution**: Make sure you:
- Copied all fields from Firebase config (don't miss any)
- Saved `src/config/firebase.ts`
- Restarted the dev server (`Ctrl+C` then `npm start`)

### Issue: "Permission denied" in Firestore

**Solution**:
- Go to Firestore → Rules tab
- Make sure you published the rules from `firestore.rules`
- Rules should allow authenticated users to read/write their own data

### Issue: App won't start / blank screen

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

### Issue: "Expo command not found"

**Solution**:
```bash
npm install -g @expo/cli
# or
npm install -g expo-cli
```

### Issue: RevenueCat errors

**Expected behavior**: RevenueCat will show errors/warnings in console without proper API keys. This is normal for local testing. The app will continue to work with simulated Pro upgrades.

To fully test RevenueCat, you need to:
1. Create RevenueCat account
2. Configure API keys in `src/config/revenuecat.ts`
3. Test on real device (not web/simulator)

---

## Testing Without RevenueCat (Recommended for Start)

You can test the full app without RevenueCat by temporarily simulating Pro status:

### Quick Pro Testing Hack

In `src/services/firebase.ts`, find `createUserProfile()` and change:
```typescript
plan: 'free',  // Change to 'pro' for testing
```

Or after creating an account, manually update in Firebase Console:
1. Go to Firestore → users collection
2. Find your user document
3. Change `plan` field from `"free"` to `"pro"`
4. Refresh app

---

## Recommended Testing Flow

**For First Run** (test core features):
1. ✅ Start with Web (`npm run web`) - fastest
2. ✅ Test authentication (signup/login)
3. ✅ Test bet tracking (add/settle bets)
4. ✅ Test all 3 tilt triggers
5. ✅ Test cool-off system

**For Mobile Testing** (test full experience):
1. ✅ Use Expo Go on your phone (easiest)
2. ✅ Test upgrade screen UI
3. ✅ Test navigation flow
4. ✅ Test on both Free and Pro plans

**For Production Prep** (when ready to launch):
1. ✅ Configure RevenueCat
2. ✅ Test real purchases in sandbox mode
3. ✅ Build with EAS Build
4. ✅ Submit to TestFlight/Internal Testing

---

## Quick Start Commands Reference

```bash
# Install dependencies
npm install

# Start dev server (then choose platform)
npm start

# Run specific platform directly
npm run web        # Web browser
npm run ios        # iOS simulator
npm run android    # Android emulator

# Clear cache if having issues
npm start -- --clear
```

---

## Next Steps After Local Testing

Once you've tested locally and everything works:

1. **Configure RevenueCat** (optional, for real subscriptions)
   - See `src/config/revenuecat.ts` for instructions

2. **Build for Distribution**
   ```bash
   npm install -g eas-cli
   eas build --platform ios
   eas build --platform android
   ```

3. **Deploy to TestFlight / Internal Testing**
   - Get real user feedback before App Store launch

---

## Tips for Efficient Testing

- **Use Web first** - Fastest iteration for UI/logic changes
- **Use Expo Go** - Great for testing on real device without builds
- **Hot reload** - Save files and see changes instantly
- **Console logs** - Check terminal for helpful debug info
- **Firebase Console** - Monitor database changes in real-time

---

**You're ready to test! Start with `npm install` then `npm start` and press `w` for web.** 🚀
