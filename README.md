# 🛡️ TiltGuard

**Responsible-play bankroll companion for Florida sports bettors**

TiltGuard is a defensive mobile app that helps you keep the promises you made to yourself about how much you'd bet this week. It doesn't pick winners — it helps you avoid emotional betting when you're on tilt.

## 🎯 The Problem

Florida has mobile sports betting, but effectively through one operator (Hard Rock Bet). This means:
- No line shopping
- No promo hopping  
- Higher risk of problem gambling behavior

After the launch, Florida saw a spike in problem-gambling calls, especially from men aged 20-35. The main behavior to stop: **"going on tilt"** — chasing losses, betting too fast, or betting after a big drawdown.

## 💡 The Solution

TiltGuard = 3 core defensive triggers:

### 1. **LOSS_STREAK Trigger**
- Fires when: `consecutiveLosses >= 3`
- Stops classic loss-chasing behavior
- Shows 60-second breather screen (Pro users)

### 2. **DRAWDOWN Trigger**  
- Fires when: `weeklySpend >= 80% of weeklyLossLimit`
- Based on YOUR own limits set during onboarding
- Reminds you: "You told yourself this was the line"

### 3. **SESSION / VELOCITY Trigger**
- Fires when: `5+ bets in last 60 minutes`
- Catches "I'm firing too fast" behavior
- Prevents emotional rapid-fire betting

## ✨ Features

### Free Tier
- ✅ Unlimited bet tracking
- ✅ Dashboard with Total P/L and ROI
- ✅ Recent bets view
- ✅ Daily check-in reminders
- ✅ Set budget & loss limits
- ⚠️ Tilt detection (shows warnings, but limited actions)

### Pro Tier ($4.99/mo or $29.99/yr)
- ✅ All Free features
- ✅ **Smart TiltGuard checks** (3 triggers)
- ✅ **60-second breather screen** when triggers fire
- ✅ **Manual cool-off timers** (1h / 24h / 3d)
- ✅ **Patterns report** (worst sport, worst day/time)
- ✅ **Coach tone customization** (calm / firm / clinical)
- ✅ Earlier and more frequent nudges

## 🏗️ Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Firebase (Auth + Firestore)
- **Subscriptions**: RevenueCat (when implemented)
- **State Management**: React Hooks
- **Navigation**: Expo Router

## 📁 Project Structure

```
TiltGuard/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with auth routing
│   ├── auth/                    # Auth screens
│   │   ├── login.tsx           # Login screen
│   │   └── signup.tsx          # Signup + onboarding
│   └── (tabs)/                  # Main app tabs
│       ├── _layout.tsx         # Tab navigation
│       ├── index.tsx           # Dashboard (home)
│       ├── patterns.tsx        # Patterns analysis
│       └── settings.tsx        # Settings
├── src/
│   ├── config/
│   │   └── firebase.ts         # Firebase initialization
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── services/
│   │   ├── tiltDetection.ts    # 3 core tilt triggers
│   │   └── firebase.ts         # Database operations
│   ├── hooks/
│   │   └── index.ts            # Custom React hooks
│   └── components/
│       ├── UI.tsx              # Shared UI components
│       └── TiltModal.tsx       # 60-second breather modal
├── firestore.rules              # Firestore security rules
├── package.json
├── app.json                     # Expo configuration
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- A Firebase project

### 1. Clone and Install

```bash
cd TiltGuard
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** (Email/Password)
4. Enable **Firestore Database**
5. Copy your Firebase config

Edit `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Firestore Rules

In Firebase Console, go to Firestore Database → Rules and paste the contents of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /stats/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /bets/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4. Run the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser (for testing)
npm run web
```

### 5. Create Test Account

1. Open the app
2. Tap "Create Account"
3. Enter email and password
4. Set weekly budget (e.g., $150)
5. Set weekly loss limit (e.g., $100)
6. Done! You're ready to track bets.

## 🧪 Testing Tilt Triggers

To test the tilt detection system:

### Test LOSS_STREAK Trigger
1. Add 3 bets with any amounts/odds
2. Settle all 3 as **losses**
3. Try to add a 4th bet
4. ✅ Tilt modal should appear

### Test DRAWDOWN Trigger
1. Set a low loss limit (e.g., $50) in onboarding
2. Add a bet for $40
3. Settle it as a **loss**
4. Try to add another bet
5. ✅ Tilt modal should appear (you're at 80%+)

### Test SESSION Trigger
1. Add 5 bets in quick succession (don't settle them)
2. Try to add a 6th bet within the hour
3. ✅ Tilt modal should appear

## 📊 Data Model

### Firestore Structure

```
/users/{userId}
  - email: string
  - createdAt: number
  - plan: "free" | "pro"
  - settings: {
      weeklyBudget: number
      weeklyLossLimit: number
      periodStart: timestamp
      periodType: "week"
      coachTone: "calm" | "firm" | "clinical"
    }

/users/{userId}/stats/main
  - totalPL: number
  - totalWagered: number
  - consecutiveLosses: number
  - weeklySpend: number
  - periodStart: timestamp
  - lastBetAt: timestamp
  - recentBetsWindowStart: timestamp
  - recentBetsWindowCount: number
  - coolOffUntil: timestamp | null

/users/{userId}/bets/{betId}
  - amount: number
  - odds: number (American odds)
  - sport: string
  - notes: string
  - status: "active" | "settled"
  - result: "win" | "loss" | "push" | null
  - createdAt: timestamp
  - settledAt: timestamp | null
```

### Why `/stats/main` is Critical

The `/stats/main` document is the "secret weapon" of TiltGuard. It stores:
- Pre-computed aggregates (total P/L, consecutive losses)
- Session tracking (recent bets window)
- Cool-off state

This means **all 3 tilt checks = ONE Firestore read**. No expensive queries. Just read stats, run checks, done.

## 🎨 Design Philosophy

### UX / Copy Rules
- **Never shame** the user
- Always reference the user's own limits: "You told us your weekly loss limit was $200..."
- Keep it short in modals (2-3 sentences)
- Offer a next step (breathe, cool-off, or cancel)
- Avoid gambling promises ("win more," "beat the book")

### Coach Tones (Pro feature)

**Calm** (default):
> "You've lost 3 in a row. Take a breath — the book isn't going anywhere."

**Firm**:
> "3 losses straight. Stop. This is exactly when bad decisions happen."

**Clinical**:
> "Consecutive loss streak detected (3). Historical data shows increased risk of tilt behavior."

## 🛣️ Roadmap

### Phase 1: MVP (Weeks 1-4) ✅
- [x] Core app structure (Expo + Firebase)
- [x] Auth flow (login/signup/onboarding)
- [x] Dashboard with bet tracking
- [x] Add/Settle bet functionality
- [x] Stats document updates
- [x] 3 tilt triggers implemented

### Phase 2: Guardrails + Paywall (Weeks 5-8) ⏳
- [x] TiltModal component (60-second breather)
- [x] Cool-off system (1h / 24h / 3d)
- [ ] RevenueCat integration
- [ ] Upgrade screen
- [x] Settings screen
- [x] Patterns screen

### Phase 3: Polish + Launch (Weeks 9-12) 📅
- [ ] Push notifications (daily check-in, near-limit)
- [ ] TestFlight / Internal testing
- [ ] App Store / Play Store assets
- [ ] Landing page (Carrd) with "Tilt Test"
- [ ] Beta launch to communities

### Future Features
- [ ] "Betting Environment" tools (latency/GPS check)
- [ ] "Edge Journal" (why am I making this bet?)
- [ ] More flexible periods (daily, monthly)
- [ ] Export weekly reports
- [ ] Anonymous aggregate "Florida Tilt Report"

## ⚖️ Legal / Safety

- **Does NOT place bets** or connect to operator APIs
- **Does NOT claim affiliation** with Hard Rock Bet or any sportsbook
- Positioned as a **responsible-play / budgeting tool**
- All data is **user-entered**
- Terms are generic: "bet," "wager," "loss" — not operator-specific

## 🤝 Contributing

This is a solo-dev project for the Florida market, but suggestions are welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test the 3 tilt triggers
5. Submit a PR

## 📄 License

MIT License - feel free to learn from this code, but please don't launch a competing product in Florida without talking to me first! 😄

## 📬 Contact

Questions? Ideas? Want to help test?

**Email**: your-email@example.com  
**Twitter**: @yourusername

---

**Remember**: TiltGuard doesn't help you win more. It helps you lose less by keeping you from betting emotionally. 

Keep your bankroll alive. 🛡️
