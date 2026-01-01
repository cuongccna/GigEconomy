\# PROJECT CONTEXT: "GigX" - Web3 Task Marketplace (UI-First Approach)



\## 1. Development Strategy

\* \*\*Phase 1: Visual Core.\*\* Build the entire UI System (Components, Animations, Layout) using dummy data. The app must LOOK finished before connecting to DB.

\* \*\*Phase 2: Backend Wiring.\*\* Connect the UI to Next.js API Routes and Local PostgreSQL via Prisma.



\## 2. Tech Stack

\* \*\*Framework:\*\* Next.js 14 (App Router).

\* \*\*Styling:\*\* TailwindCSS + `framer-motion` (Mandatory for all interactions).

\* \*\*Icons:\*\* `lucide-react`.

\* \*\*Utils:\*\* `clsx`, `tailwind-merge`.

\* \*\*Database:\*\* PostgreSQL (Prisma ORM).



\## 3. Design System (Cyberpunk/Degen Vibe)

\* \*\*Color Palette:\*\*

&nbsp;   \* Background: `#050505` (Deep Black).

&nbsp;   \* Primary: `#00FF94` (Neon Green) - For success/money.

&nbsp;   \* Secondary: `#7000FF` (Neon Purple) - For premium/rare items.

&nbsp;   \* Accents: `#FF003C` (Glitch Red).

\* \*\*Typography:\*\* Digital/Coding font (e.g., 'Courier Prime' or system mono).

\* \*\*Effects:\*\*

&nbsp;   \* \*\*Glassmorphism:\*\* `backdrop-blur-md bg-white/5`.

&nbsp;   \* \*\*Glow:\*\* `box-shadow: 0 0 10px theme('colors.neon-green')`.

&nbsp;   \* \*\*Micro-interactions:\*\* Buttons scale on press. Lists stagger on load.



\## 4. Key Components to Build

\* `NeonCard`: Main container for tasks.

\* `GlitchText`: For headers.

\* `CyberButton`: Primary action button with pulse effect.

\* `BottomNav`: Floating glass bar.

## 6. Web3 Integration (Next Phase)
* **Library:** `@tonconnect/ui-react`.
* **Manifest:** A `tonconnect-manifest.json` file is required in the `public` folder.
* **Wallet Page Logic:**
    * If not connected: Show big "Connect Wallet" button.
    * If connected: Show formatted Address (e.g., `UQ...A1z`), and a "Disconnect" button.
    * **Note:** The UI must match the Neon/Dark theme (Override default TON styles if needed or wrap it).

## 7. Referral System (Growth Engine)
* **Mechanic:** Users invite friends via a unique Telegram link (`t.me/botname?start=ref_USERID`).
* **Database Update:**
    * `User` model needs `referredById` (Self-relation) and `referralCount`.
* **Reward Logic:**
    * **Direct Reward:** +1000 $GIG for both inviter and invitee immediately.
    * **Passive:** Inviter gets 10% of every task the invitee completes (Future implementation, for now just direct reward).
* **UI:** A "Friends" tab showing the Link, Stats, and a List of invited users ("My Squad").


## 8. Daily Check-in Feature (Retention)
* **Concept:** "Daily Supply Drop". Users claim rewards every 24h.
* **Mechanic:** 7-Day Cycle.
    * Day 1-6: Small reward (e.g., 100 -> 600 $GIG).
    * Day 7: Big Reward (e.g., 2000 $GIG + Rare Item).
* **Rules:**
    * Streak resets to Day 1 if user misses a day.
    * Database needs `lastCheckIn` (DateTime) and `streak` (Int).

## 9. Monetization (Adsgram)
* **Service:** Adsgram.ai (The standard for Telegram Ads).
* **Implementation:**
    * Add script `<script src="https://adsgram.ai/js/adsgram.js?blockId=YOUR_BLOCK_ID"></script>` to head.
    * Interface: `window.AdController`.
* **Flow:** User watches Ad -> `onReward` callback fires -> Call API to grant free spin (or 500 $GIG).