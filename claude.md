# TiltGuard - Claude Context

## Project Overview

TiltGuard is a **defensive mobile app** for Florida sports bettors that helps prevent problem gambling behavior by detecting and interrupting "tilt" - the emotional state where bettors chase losses, bet too fast, or exceed their self-imposed limits.

**Core Philosophy**: We don't help users win more. We help them lose less by preventing emotional betting decisions.

**Target Market**: Florida bettors (limited to Hard Rock Bet operator) who want to stick to their own betting limits.

## Tech Stack

- **Frontend**: React Native with Expo (~51.0.0)
- **Language**: TypeScript (strict mode)
- **Backend**: Firebase (Auth + Firestore)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks (no Redux)
- **Future**: RevenueCat for subscriptions (not yet implemented)

## Architecture

### File Structure
```
TiltGuard/
├── app/                          # Expo Router pages (file-based routing)
│   ├── _layout.tsx              # Root layout with auth routing
│   ├── auth/                    # Auth screens
│   │   ├── login.tsx
│   │   └── signup.tsx           # Includes onboarding flow
│   └── (tabs)/                  # Main app (tab navigation)
│       ├── _layout.tsx
│       ├── index.tsx            # Dashboard (home)
│       ├── patterns.tsx         # Patterns analysis (Pro)
│       └── settings.tsx
├── src/
│   ├── config/
│   │   └── firebase.ts          # Firebase initialization
│   ├── types/
│   │   └── index.ts             # All TypeScript types & constants
│   ├── services/
│   │   ├── tiltDetection.ts     # ⭐ THE BRAIN - 3 core triggers
│   │   └── firebase.ts          # Database operations
│   ├── hooks/
│   │   └── index.ts             # Custom React hooks
│   └── components/
│       ├── UI.tsx               # Shared UI components
│       └── TiltModal.tsx        # 60-second breather modal
├── firestore.rules              # Firestore security rules
├── package.json
├── app.json                     # Expo configuration
└── tsconfig.json
```

### Data Model (Firestore)

**CRITICAL INSIGHT**: The `/users/{uid}/stats/main` document is the performance optimization that makes TiltGuard work efficiently.

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
  - totalPL: number                    # Running total P/L
  - totalWagered: number
  - consecutiveLosses: number          # For LOSS_STREAK trigger
  - weeklySpend: number                # For DRAWDOWN trigger
  - periodStart: timestamp
  - lastBetAt: timestamp
  - recentBetsWindowStart: timestamp   # For SESSION trigger
  - recentBetsWindowCount: number      # For SESSION trigger
  - coolOffUntil: timestamp | null     # Cool-off end time

/users/{userId}/bets/{betId}
  - amount: number
  - odds: number                       # American odds (e.g., -110, +150)
  - sport: string
  - notes: string
  - status: "active" | "settled"
  - result: "win" | "loss" | "push" | null
  - createdAt: timestamp
  - settledAt: timestamp | null
```

**Why stats/main is brilliant**: All 3 tilt checks require only ONE Firestore read. No complex queries, no multiple reads.

## The 3 Core Tilt Triggers

Located in `src/services/tiltDetection.ts`:

### 1. LOSS_STREAK Trigger
```typescript
if (consecutiveLosses >= 3) → TRIGGER
```
**Purpose**: Stop classic loss-chasing behavior
**Resets**: When user wins or pushes

### 2. DRAWDOWN Trigger
```typescript
if (weeklySpend >= 80% of weeklyLossLimit) → TRIGGER
```
**Purpose**: Remind user they're approaching their own self-imposed limit
**Resets**: Weekly (based on periodStart)

### 3. SESSION/VELOCITY Trigger
```typescript
if (5+ bets placed in last 60 minutes) → TRIGGER
```
**Purpose**: Catch rapid-fire emotional betting
**Resets**: Rolling 60-minute window

### Trigger Response Flow

```
User taps "Add New Bet"
  ↓
Check: Is cool-off active?
  ↓ (yes → show alert, block)
  ↓ (no → continue)
Read stats/main document
  ↓
Run checkTiltTriggers(stats, settings)
  ↓
Triggered?
  ↓ (yes → show TiltModal)
  │   ↓
  │   Free user: Show warning + upgrade CTA
  │   Pro user: 60-second countdown + cool-off option
  ↓ (no → show bet form)
Add bet to Firestore
  ↓
Update session tracking in stats/main
  ↓
Refresh UI
```

## Key Features

### Free Tier
- Unlimited bet tracking
- Dashboard with P/L and ROI
- Tilt warnings (but can skip)
- Set budget & loss limits

### Pro Tier ($4.99/mo or $29.99/yr)
- All Free features
- **60-second forced breather** when triggers fire
- **Cool-off timers** (1h / 24h / 3d) - completely blocks betting
- **Patterns report** (best/worst sports, active days)
- **Coach tone customization** (calm / firm / clinical)

## Development Guidelines

### TypeScript Standards
- Strict mode enabled
- No `any` types (except in error handling)
- All types defined in `src/types/index.ts`
- Proper type annotations for function parameters and returns

### Firebase Best Practices
- **Never store sensitive data** in Firestore
- **Atomic updates** for stats when settling bets
- **Security rules**: Users can only read/write their own documents
- **Offline persistence**: Not currently enabled (consider for v2)

### Component Patterns
- Use functional components with hooks
- Custom hooks in `src/hooks/index.ts` for data fetching
- Reusable UI components in `src/components/UI.tsx`
- Keep screens lean - logic in services/hooks

### State Management
- No global state library (Redux, MobX, etc.)
- Use React Context sparingly
- Prefer custom hooks for Firebase data
- Local state with `useState` for UI

### Error Handling
- Always wrap Firebase calls in try/catch
- Show user-friendly error messages
- Log errors to console (add Sentry in production)

### UX/Copy Rules
1. **Never shame the user** - avoid judgmental language
2. **Reference their own limits** - "You told us your limit was $200..."
3. **Keep modals short** - 2-3 sentences max
4. **Offer next steps** - breathe, cool-off, or cancel
5. **Avoid gambling promises** - never say "win more" or "beat the book"

## Testing Strategies

### Testing Tilt Triggers Manually

**LOSS_STREAK**:
1. Add 3 bets (any amounts)
2. Settle all as "Loss"
3. Try to add 4th bet
4. ✅ Modal should appear

**DRAWDOWN**:
1. Set low loss limit (e.g., $50)
2. Add $40 bet
3. Settle as "Loss"
4. Try to add another bet
5. ✅ Modal should appear (at 80%)

**SESSION**:
1. Add 5 bets quickly (don't settle)
2. Try to add 6th bet within the hour
3. ✅ Modal should appear

### Unit Testing (Future)
- Test `checkTiltTriggers()` with various stat combinations
- Test bet settlement logic (P/L calculations)
- Test weekly period resets
- Test cool-off calculations

## Common Tasks

### Adding a New Tilt Trigger

1. Add constant to `src/types/index.ts`:
   ```typescript
   export const TILT_CONSTANTS = {
     NEW_TRIGGER_THRESHOLD: 10,
   };
   ```

2. Update `TriggerType` enum in `src/types/index.ts`

3. Add check in `src/services/tiltDetection.ts`:
   ```typescript
   function checkTiltTriggers(stats, settings) {
     // ... existing checks

     if (stats.newMetric >= TILT_CONSTANTS.NEW_TRIGGER_THRESHOLD) {
       return { triggered: true, triggerType: 'NEW_TRIGGER' };
     }
   }
   ```

4. Add message in `getTriggerMessage()`

5. Update stats tracking if needed

### Customizing Coach Tones

Edit `src/services/tiltDetection.ts` → `getTriggerMessage()`:
```typescript
switch(tone) {
  case 'calm': return "Supportive, gentle message";
  case 'firm': return "Direct, assertive message";
  case 'clinical': return "Data-driven, neutral message";
}
```

### Changing Trigger Thresholds

Edit constants in `src/types/index.ts`:
```typescript
export const TILT_CONSTANTS = {
  LOSS_STREAK_THRESHOLD: 3,        // Change to 2 or 4
  DRAWDOWN_PCT_THRESHOLD: 0.8,     // Change to 0.7 or 0.9
  SESSION_WINDOW_MINUTES: 60,      // Change to 30 or 90
  SESSION_BET_COUNT_THRESHOLD: 5,  // Change to 3 or 7
  BREATHER_DURATION_SECONDS: 60,   // Change to 30 or 90
};
```

### Adding RevenueCat Subscriptions

1. Install: `npx expo install react-native-purchases`
2. Create `src/services/subscriptions.ts`
3. Initialize in `app/_layout.tsx`
4. Check subscription status before showing Pro features
5. Update `plan` field in user profile when subscription changes

### Setting Up Push Notifications

1. Install Expo Notifications
2. Request permissions on signup
3. Save push token to user profile
4. Schedule local notifications for:
   - Daily check-in reminders
   - Near-limit warnings (90% of loss limit)
   - Cool-off end notifications

## Deployment

### Environment Setup
- Firebase config in `src/config/firebase.ts` (use environment variables in production)
- Deploy Firestore rules from `firestore.rules`
- Enable Email/Password auth in Firebase Console

### Building for Stores

**iOS (TestFlight)**:
```bash
eas build --platform ios --profile preview
```

**Android (Internal Testing)**:
```bash
eas build --platform android --profile preview
```

**Production**:
```bash
eas build --platform all --profile production
eas submit --platform all
```

## Legal/Safety Considerations

- **Does NOT place bets** or connect to operator APIs
- **Does NOT affiliate** with Hard Rock Bet or any sportsbook
- **Positioned as budgeting/harm-reduction tool**
- All data is **user-entered** and **private**
- Terms avoid operator-specific language
- Include responsible gambling resources in app

## Performance Optimization

### Current Performance
- **Firestore reads per bet add**: 2 (stats + settings)
- **Firestore writes per bet add**: 2 (bet doc + stats)
- **Tilt check cost**: 0 (uses already-loaded stats)

### Future Optimizations
- Cache user settings in AsyncStorage
- Implement optimistic UI updates
- Add Firestore offline persistence
- Lazy load patterns data
- Implement pagination for bet history (after 50+ bets)

## Roadmap Status

### Phase 1: MVP (Weeks 1-4) ✅
- [x] Core app structure
- [x] Auth + onboarding
- [x] Dashboard + bet tracking
- [x] 3 tilt triggers

### Phase 2: Guardrails + Paywall (Weeks 5-8) ⏳
- [x] TiltModal + breather
- [x] Cool-off system
- [x] Settings + Patterns screens
- [ ] RevenueCat integration
- [ ] Upgrade/paywall screen

### Phase 3: Launch (Weeks 9-12) 📅
- [ ] Push notifications
- [ ] App Store assets
- [ ] Landing page
- [ ] TestFlight beta
- [ ] Store submission

## Important Files to Review

When working on this codebase, always review:

1. **`src/services/tiltDetection.ts`** - The core logic
2. **`src/types/index.ts`** - All types and constants
3. **`firestore.rules`** - Security (must stay in sync with data model)
4. **`app/(tabs)/index.tsx`** - Main dashboard (most complex screen)
5. **`src/components/TiltModal.tsx`** - Critical UX component

## Troubleshooting

### Firebase Connection Issues
- Verify `src/config/firebase.ts` has correct credentials
- Check Firestore rules are deployed
- Confirm Auth is enabled in Firebase Console

### Tilt Triggers Not Firing
- Check stats document structure matches schema
- Verify constants in `src/types/index.ts`
- Test with console.log in `checkTiltTriggers()`

### Weekly Reset Not Working
- Check `periodStart` timestamp in stats
- Verify weekly calculation logic in `updateUserStats()`
- Test period rollover manually by setting old periodStart

## Contact & Resources

**Project Type**: Solo-dev MVP for Florida market
**License**: MIT
**Framework Docs**: https://docs.expo.dev/
**Firebase Docs**: https://firebase.google.com/docs

---

**Remember**: TiltGuard is about harm reduction, not profit maximization. Every feature should help users stick to their own commitments.
