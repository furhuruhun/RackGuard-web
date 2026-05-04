# CLAUDE.md

Behavioral guidelines for the **RackGuard** project. Reduces common LLM coding mistakes. Merge with project-specific instructions as needed.

**Project context:** RackGuard — Smart bookshelf system with electronic locking for self-service book lending. See `RackGuard_Frontend_Context.md` for full system specification.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**RackGuard-specific:**
- If a feature touches IoT/hardware (NFC, RFID, solenoid lock), confirm whether it's frontend-only mocking or actual integration.
- If real-time sync behavior is unclear (Firebase Realtime DB vs polling), ask before choosing.
- If a screen exists in `RackGuard_Frontend_Context.md`, follow that spec — don't reinvent layouts.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

**RackGuard-specific:**
- Don't build admin features into the mobile app (admin = web dashboard only).
- Don't build peminjam features into the web dashboard (peminjam = mobile only).
- Don't add config screens for things that are hardcoded constants in the spec (e.g., loan duration, fine rate) unless asked.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
- "Build the catalog page" → "Renders book list from Firebase, search filters work, status badges match spec"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Tech Stack Constraints

**Mobile App (Peminjam):**
- Framework: **Flutter** (Dart)
- State management: Provider or Riverpod
- HTTP client: Dio
- Local storage: Hive / SharedPreferences for cache
- NFC: `nfc_manager` or equivalent
- Push notifications: Firebase Cloud Messaging (FCM)
- Min targets: Android 8.0+ (API 26), iOS 13+

**Web Dashboard (Admin):**
- Framework: **Next.js** (React) with App Router
- Styling: **Tailwind CSS**
- State management: Zustand or React Context (no Redux unless asked)
- Data fetching: React Query (TanStack Query) or SWR
- Charts: Recharts
- Min target: Modern desktop browsers, viewport ≥ 1280px

**Backend / Data Layer:**
- **Firebase Realtime Database** for live sync (shelf status, book status)
- **Firebase Authentication** for login (mobile + web)
- **Firebase Cloud Functions** for business logic (fine calculation, lock authorization)
- **Firebase Cloud Messaging** for push notifications

**IoT (out of frontend scope, but referenced):**
- ESP32 microcontroller, RFID RC522, Solenoid Lock 12V

---

## UI Constraints

When generating any frontend code:
- Read `DESIGN.md` for design tokens, color palette, and component patterns.
- Read `RackGuard_Frontend_Context.md` for screen specs, data models, and user flows.
- Mobile screens must match the mockup descriptions in section 2.4 of the context doc.
- Web dashboard screens must match the layout described in section 3.5 of the context doc.

---

## Scope Guard

Do not implement the following unless explicitly requested:

- IoT firmware code (ESP32, RFID readers, solenoid drivers).
- Hardware-level NFC/RFID protocol logic — use platform SDKs only.
- Backend services beyond Firebase (no custom Go/Node servers).
- Multi-library / multi-tenant support (single library scope).
- Advanced analytics beyond what's in the Reports page spec.
- Payment gateway integration (fine payment is referenced but out of MVP frontend scope).
- Real RFID anti-collision algorithms (handled by hardware/firmware).
- Internationalization beyond Bahasa Indonesia (i18n is non-MVP).

---

## RackGuard-Specific Conventions

**Roles & Boundaries:**
- `Peminjam` (borrower) — mobile app only.
- `Admin` / `Chief Librarian` — web dashboard only.
- Don't cross-pollinate features between platforms without explicit request.

**Data Models:**
- Use the exact schemas defined in `RackGuard_Frontend_Context.md` section 4.3.
- Don't introduce new fields in `Book`, `Transaction`, `Shelf`, etc. without flagging it.
- IDs follow conventions: `BK-XXX` for books, `TX-XXXX` for transactions, `RACK-X-N` for shelves.

**Real-time vs Static Data:**
- Real-time (Firebase listeners): shelf status, book availability, live transactions feed, user notifications.
- Static (one-time fetch + cache): book metadata (title, author), member profile, historical reports.

**Status Vocabulary (must be consistent):**
- Book: `available` | `borrowed` | `overdue`
- Member: `active` | `warned` | `suspended`
- Transaction: `active` | `completed` | `overdue`
- Shelf lock: `locked` | `unlocked`
- Shelf connectivity: `online` | `offline`

**Language:**
- UI copy: Bahasa Indonesia (default).
- Code, comments, commit messages: English.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
