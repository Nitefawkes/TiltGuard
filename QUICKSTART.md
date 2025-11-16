# 🚀 TiltGuard Quick Start Guide

Get TiltGuard running in 10 minutes!

## Step 1: Install Dependencies (2 min)

```bash
cd TiltGuard
npm install
```

## Step 2: Firebase Setup (5 min)

### A. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project" → Name it "TiltGuard" → Continue
3. Disable Google Analytics (optional) → Create project

### B. Enable Authentication
1. In Firebase console, click "Authentication" → "Get Started"
2. Click "Sign-in method" tab
3. Enable "Email/Password" → Save

### C. Enable Firestore Database
1. Click "Firestore Database" → "Create database"
2. Start in **test mode** (we'll add rules next)
3. Choose a location (us-central1 recommended for Florida)
4. Click "Enable"

### D. Get Your Config
1. Click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps" → Click web icon `</>`
3. Register app: name it "TiltGuard" → Register
4. Copy the `firebaseConfig` object

### E. Add Config to App
Open `src/config/firebase.ts` and replace the placeholder config:

```typescript
const firebaseConfig = {
  apiKey: "AIza....",              // Paste your values here
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

### F. Set Firestore Security Rules
1. In Firestore Database, click "Rules" tab
2. Copy the contents of `firestore.rules` from this project
3. Paste into the Firebase rules editor
4. Click "Publish"

## Step 3: Run the App (1 min)

```bash
npm start
```

This opens Expo DevTools. Then:

- **iOS**: Press `i` (requires Mac + Xcode)
- **Android**: Press `a` (requires Android Studio + emulator)
- **Web**: Press `w` (works immediately!)

## Step 4: Test It Out! (2 min)

### Create Your Account
1. Tap "Create Account"
2. Enter email: `test@example.com`
3. Password: `password123`
4. Weekly budget: `$150`
5. Weekly loss limit: `$100`

### Add Some Bets
1. Tap "Add New Bet"
2. Amount: `$20`, Odds: `-110`, Sport: `NFL`
3. Tap "Add Bet"
4. Repeat 2 more times

### Settle a Bet
1. Tap on a bet
2. Tap "Settle Bet"
3. Choose "Loss"

### Test a Trigger
1. Settle 2 more bets as "Loss" (now you have 3 losses)
2. Try to add another bet
3. 🛡️ **TiltGuard activates!** You'll see the breather modal

## Common Issues

### "Firebase not configured"
- Check that you copied ALL fields from Firebase config
- Make sure you saved `src/config/firebase.ts`
- Restart the dev server

### "Permission denied" error
- Go to Firebase Console → Firestore → Rules
- Make sure you published the security rules
- Rules should match the `firestore.rules` file

### "Expo command not found"
```bash
npm install -g expo-cli
```

### App won't start
```bash
# Clear cache and restart
rm -rf node_modules
npm install
npm start -- --clear
```

## What's Next?

✅ **You have a working TiltGuard app!**

Now you can:
1. Add more bets and test the other triggers
2. Try the cool-off feature (Settings → active cool-off)
3. Check out Patterns (requires 5+ settled bets)
4. Customize coach tone in Settings (Pro feature coming soon)

## Need Help?

- 📖 Full docs: See `README.md`
- 🐛 Issues: Check that Firebase is configured correctly
- 💬 Questions: Open an issue on GitHub

---

Built with ❤️ for responsible sports betting in Florida
