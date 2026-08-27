# NextQ Infrastructure Designer / ProjectIQ — Design System Specification

Single source of truth for the platform's visual design system. All new components, screens, and features must adhere strictly to these tokens and patterns.

---

## 1. Design Tokens

### CSS Variables (`:root`)

```css
:root {
  /* Surfaces */
  --bg: #F7F7F5;
  --surface-1: #FFFFFF;
  --surface-2: #F4F4F1;
  --surface-3: #EDEDE9;
  --surface-hover: #EDEDEA;

  /* Borders */
  --border: #E4E4DF;
  --border-strong: #D6D6CF;

  /* Text */
  --text-primary: #171714;
  --text-secondary: #6B6B63;
  --text-tertiary: #9C9C93;

  /* Brand — Orange is the ONLY accent/brand color */
  --accent: #FF6600;
  --accent-hover: #E65C00;
  --accent-text: #C2480A;      /* Text/links on light backgrounds */
  --accent-soft: #FFF0E4;      /* Background for brand callouts/badges */
  --accent-border: #FFC299;    /* Border matching accent-soft */

  /* Semantic States — NEVER use brand orange for these states */
  --success: #16A34A;
  --success-soft: #E9F8EF;
  --warn: #B7791F;             /* Amber — "needs attention" */
  --warn-soft: #FBF1DD;
  --danger: #DC2626;           /* Destructive actions / errors */
  --pending: #9C9C93;

  /* Typography */
  --font-ui: 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'SFMono-Regular', monospace;
}
```

---

## 2. Color Usage Rules

1. **`--accent` (`#FF6600`)**:
   * Used **only** for primary actions (main CTAs/buttons), active navigation/tab states, active stepper steps, and brand highlights.
   * **Never** use brand orange for warnings or errors.
2. **`--warn` (`#B7791F`)**:
   * Used **only** for "needs attention" states (e.g. high bandwidth usage, unconfigured routes). Deliberately distinct from brand orange.
3. **`--danger` (`#DC2626`)**:
   * Used **only** for real destructive actions (delete, revoke) and hard errors.
4. **`--success` (`#16A34A`)**:
   * Used for completed/approved/OK states.
5. **No hardcoded legacy colors**:
   * Do not use old indigos, blues, dark slates (`#0c0f1d`, `#020617`, `indigo-*`, `sky-`, `slate-950`).

---

## 3. Typography Scale & Fonts

* **UI Font (`Geist`)**: Used across all headings, body text, labels, and buttons.
* **Mono Font (`Geist Mono`)**: Used **exclusively** for numeric/technical figures: quantities, lengths, IP addresses, codes, IDs, monetary figures, timestamps.

### Scale Reference
* **Page Title**: `19–20px`, weight `600`, letter-spacing `-0.2px`.
* **Card/Section Title**: `14px`, weight `700`.
* **Table Body / Label**: `12–13px`, weight `400–600`.
* **Uppercase Eyebrows / Table Headers**: `10–11px`, weight `700`, uppercase, letter-spacing `0.05em`, color `--text-tertiary`.
* **Secondary / Helper Text**: `11–11.5px`, color `--text-secondary` or `--text-tertiary`.

---

## 4. Layout & Spacing Rules

* **Radii**:
  * Large Cards / Containers: `9–10px` (`rounded-xl` / `rounded-2xl`).
  * Buttons / Chips: `6–8px` (`rounded-lg`).
  * Avatars / Dots: `50%` (`rounded-full`).
* **Container Heights**:
  * Fixed-height content should use natural height (`flex: 0 0 auto`) to avoid empty gaps inside cards.
* **Destructive Actions**:
  * All delete / remove actions **must** sit behind a three-dot (`⋯`) menu, never as a direct trash icon on the row/card.

---

## 5. Base Components Specification

1. **Primary Button**:
   * Background: `--accent` (`#FF6600`), hover `--accent-hover` (`#E65C00`), text white, weight `700`, radius `7–8px`.
2. **Secondary Button**:
   * Background: `--surface-1` (`#FFFFFF`), border `1px solid var(--border)`, text `--text-primary`.
3. **Action Link**:
   * Text color `--accent-text` (`#C2480A`), weight `700`, with `→` arrow.
4. **Status Badges**:
   * 6px colored dot + label. Matches semantic color (green = active/OK, amber = needs attention, gray = pending, red = error).
5. **Stat Card**:
   * Small uppercase eyebrow label, large value in `--font-mono` weight `700`, description below in `--text-tertiary`. Background `--surface-1`, border `--border`.
6. **Stepper**:
   * Current step = solid orange circle (`--accent`).
   * Completed step = solid green circle (`--success`) with checkmark.
   * Pending step = gray outline circle (`--pending`).
