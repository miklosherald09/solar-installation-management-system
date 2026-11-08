# WorkWorkWork — Trust Surface Roadmap

**Purpose:** Make WorkWorkWork _decidable_ in a barangay. A homeowner in Sta. Barbara
will only pick a stranger over "the guy my kapitana recommended" if the app answers
one question better than gossip does: **"Can I trust this person with my home?"**

This document is the engineering counterpart to `MARKETING_STRATEGY.md`. Every item
maps to a file that already exists or a model that already exists, so this is wiring
and small deltas — **not** a rewrite, and **not** new infrastructure.

## 0. North star and assumptions

The only metric that matters (from `MARKETING_STRATEGY.md` §11.1):

> **North-Star: Weekly Matched Jobs** — a job posted → called/messaged → completed.

Trust surfaces serve that metric through one gate in particular:
**Gate 4 — Average rating > 4.6★.** You cannot hit 4.6 stars if nobody can leave a
review, and you cannot keep 4.6 stars if a single unfair 1-star review can kill an
honest worker in a small town. Everything below is in service of _review volume_
and _review fairness_, because those two things are the actual product.

**Assumptions (do not proceed if these are false):**

1. Supply seeding (50–70 pros) is happening in parallel — trust surfaces are useless
   in an empty app. This doc assumes the two-sided loop exists.
2. You — the owner — are the "trust operator" for Sta. Barbara. Phase 4 gives you a
   queue to answer in 15 min/day. You are the differentiation; do not automate
   yourself out of it.

## 1. State of trust today (audited, 2026-09-12)

| Capability                                      | Backend                     | App UI                             | Notes                                                 |
| :---------------------------------------------- | :-------------------------- | :--------------------------------- | :---------------------------------------------------- |
| Reviews (1–5 ✦ + comment, 1 per work-pair)      | ✅ `reviews.service.ts`     | ✅ `ReviewSheet.tsx`               | Validates work is `completed` + both parties involved |
| Credibility stats (avg, count, completed works) | ✅ `reviews.service.ts`     | ✅ `CredibilityBadge.tsx`          | Enriched onto `postedByUser` in work responses        |
| Block / unblock                                 | ✅ `users.service.ts`       | ✅ `UserProfileSettingsScreen.tsx` | Includes mutual `blockedBy` check                     |
| Support tickets                                 | ✅ `support.service.ts`     | ✅ `HelpSupportScreen.tsx`         | Free-text only                                        |
| Report a user in-app                            | ❌ (mailto in T&C only)     | ❌                                 | **Missing — highest-priority gap**                    |
| "Verified Pro" badge                            | ❌ no field                 | ❌ no component                    | **Promised in marketing, zero code**                  |
| Public list of reviews (with context)           | ✅ `GET /users/:id/reviews` | ❌ not wired to a screen           | API ready, UI missing                                 |
| Star rating on WorkCard                         | ✅ compact variant exists   | ❌ unused                          | `FEATURES.md #2` — build it, just wire it             |
| Review challenge / appeal                       | ❌                          | ❌                                 | Needed for small-town fairness (Phase 2)              |
| Completed-works list on profile                 | ⚠️ count only               | ❌                                 | Count exists; no evidence list                        |
| Admin/moderation surface                        | ❌ (Role enum only)         | ❌                                 | Needed for reports/verification (Phase 4)             |

---

## Phase 0 — Launch blockers (before any new trust features)

Ship nothing new until these are done. One of these is an active bug sitting in your
working tree right now.

2. **[FLOW] Reviews triggered at completion, not discovered** — if the only way to
   rate someone is hunting through their profile, review volume will be ~0 and
   Gate 4 is dead. After the _"Work Completed"_ confirmation
   (`WorkDetailContent.tsx`, Prompt.ai #73), show the `ReviewSheet` immediately for
   the counterparty — poster reviews worker _and_ worker reviews poster, both sides.

---

## Phase 1 — Wire trust that is already built (Week 1)

**1.1 Star rating on every WorkCard** _(small, high-leverage)_
The compact `CredibilityBadge` already exists (`src/components/CredibilityBadge.tsx`,
`compact` variant, "e.g. WorkCard"). It is used exactly once (`UserProfileHeroCard`).
Add it to the work cards in `src/screens/home/` (and search results + work detail
header). This is `FEATURES.md #2`. A job poster sees "★ 4.8 (23)" next to _every_
worker before opening the profile. That converts strangers into people with a
reputation at a glance — nothing else moves Gate 4 faster per hour spent.

**1.2 Public "Reviews" screen** _(small)_
`GET /users/:id/reviews` + `getUserReviews()` + the `useReviews` hook already work;
there is just no screen. Add a "Reviews" entry/route off `UserProfileScreen` that
renders the paginated list. Each row must contextualize: the work category/title,
relative date, reviewer name/photo, rating, comment. Reviews without context are
rumors; reviews with context are evidence.

**1.3 In-app "Report user"** _(medium — the safety gap)_
Today a user who is harassed can only block (works) or email a hidden T&C link.
Add a "Report User" action — the natural home is an action sheet from
`UserProfileScreen` (mirror the existing `ConversationActionsSheet` pattern) or the
"..." menu next to Block in `UserProfileSettingsScreen`. Reported → backend creates
a `SupportTicket` with `type = 'report'` and a reason enum (harassment / scam /
fakery / unsafe / other). Reuse `support.service.ts` with a nullable `workId`. Never
tell the reported user who reported them.

**1.4 Verified Pro badge — minimum viable** _(medium, internal tooling)_
Marketing promises the "Verified Pro ng Sta. Barbara" badge; the code has nothing.
For Sta. Barbara the verification is **you personally** during concierge onboarding
(you already plan to vet 50–70 pros). Build the _smallest_ thing that honors that:

- `schema.prisma`: add `verifiedAt DateTime?` and `verifiedByUserId String?` to
  `User` (a migration — columns, not a table).
- One protected endpoint: `POST /admin/users/:id/verify` guarded by the existing
  `Role` enum (`ADMIN`/`MODERATOR`); auth already exists.
- Client: a `VerifiedBadge` component (small shield/check, visually distinct from
  stars), shown next to the name in `UserProfileHeroCard` and on work cards.
  That is it. No document upload, no ID validation, no algorithms — in a small town
  _your word is the verification_. Add uploads later only if a second town forces
  centralized verification.

---

## Phase 2 — Review fairness (Week 2–3)

Small towns are high-stakes: one vengeful 1-star can kill a worker's income. Fairness
is not a nice-to-have here; it is the difference between a trust flywheel and a
defamation engine. This phase exists because Gate 4 (avg > 4.6) makes you _more_
vulnerable to a single bad rating, so the system must be self-correcting.

**2.1 Review challenge window** _(backend + small UI)_
Add to `Review`: `challengedAt DateTime?`, `resolution String?` with
`NONE | UPHELD | REMOVED` (additive migration only). A reviewee can challenge a
review they believe is retaliation/fake **within 7 days of receiving it** (one
challenge per review). Flow: challenge posts a support ticket tagged with the
`reviewId`; the owner (Phase 4 queue) looks at the conversation/call/work evidence
and sets either `REMOVED` (hidden from the average; the reviewer is notified and is
permanently locked out of re-rating that work) or `UPHELD`. No appeal escalations
for a 100-user town; one pair of human eyes.

**2.2 Impulse-control on ratings** _(tiny, big effect)_

- Edit window: a reviewer may edit their rating/comment within 24h (typos, rage,
  buyer remorse). After that, the challenge path is the only option.
- No review deletion by users. Ever. If a reviewer wants out, the challenge window
  exists instead — deletion is how retaliation patterns get gamed.

**2.3 Anti-collusion, priced for a small town** _(no new tables, one query each)_

- Do not display the counterparty's rating until both sides have submitted _or_ the
  review deadline passes. With both-must-rate, a 1-star retribution is never a
  "result" of seeing the other person's low rating first. (Both-sided review is
  already the right model — Phase 0.3 — this just delays _display_.)
- Collusion sweep: monthly query for reviewer→reviewee pairs who rate each other
  5★ within 24h of each other on >2 works. At your data volume this is a SQL query
  on a Friday, not a model.

---

## Phase 3 — Evidence, not just numbers (Week 3–4)

**3.1 Completed-works list on the profile**
You already count `completedWorks`; show the list. Reuse `works` (status
`completed`, `acceptedUserIds` contains the user, joined with category + date). A
worker profile saying "27 works done" with a visible list of what they did is the
strongest trust signal you have that costs nothing new to build.

**3.2 Attach every review to its work (UI pass)**
The schema already links `Review.workId`; the reviews screen (1.2) must render the
work title/category/date with each review. That is what makes a review feel _real_
instead of a number.

**3.3 Optional verification artifacts — only if Phase 2 passes**
If reports of fakery (workers claiming skills they lack) emerge _after_ launch,
allow a verified pro to attach up to 3 photos of credentials/previous work to their
profile, visible only with the Verified badge. **Do not** build government-ID
upload, background-check integrations, or license verification — the legal/PII
surface is not worth it at this stage, and it will scare off the exact workers you
need.

---

## Phase 4 — Human systems (the actual scaling lever)

**4.1 A 15-min/day trust queue**
The bottleneck for trust in a small town is not code — it is _who answers the
reports and challenges_. Build one minimal admin surface:

- `backend/src/admin/` — endpoints: list open reports, list pending review
  challenges, verify a user. Guarded by `Role.ADMIN`. ~3 handlers reusing existing
  services.
- Consume it from the simplest possible thing: a protected read-only web page, or a
  tiny script that prints the queue to your terminal. **Do not build an admin app.
  Do not build a dashboard.** You are one person with a day job; your queue is
  "what did people report/challenge since I last checked."
- SLAs you can actually keep: reports → acknowledged within 24h, acted within 72h;
  challenges → decided within 48h. Write these into the support-ticket responses so
  users feel the system is alive.

**4.2 Report-threshold auto-hide**
When a user accumulates ≥2 distinct reports (different reporters), auto-hide them
from search/workcards with a "profile under review" state _pending human review_.
This is a WHERE-clause, not a system: a `hiddenUntil`/`reviewedAt` column on `User`
plus the flip in the work/search queries. It signals that the platform acts, which
is the real deterrent in a tight community.

---

## Kill list — explicitly NOT building

These look like trust features and are traps for a solo operator:

- ❌ Background checks / national ID / biometric verification. Legal + PII burden,
  chases away the supply, and Facebook groups don't have it either — your bar for
  "as trusted as the barangay group" is lower than you think.
- ❌ Escrow / in-app payments. Money custody is a different risk surface (and a
  regulated one). Until you have real matched-job volume, payment stays cash/GCash
  between users, exactly like the market you're displacing.
- ❌ Anonymous reviews. In a small town, hiding the reviewer behind the screen is
  how grudges get manufactured. Reviewer name/photo always visible.
- ❌ Automated quality scores, AI moderation, algorithmically-boosted workers. One
  human (you) with a small queue beats a fake-precision model, and keeps the app
  feeling like a coop, not a commodity marketplace.
- ❌ Any feature requiring new infrastructure (Redis, queues, external verification
  SaaS). Everything above is columns + endpoints + screens.

---

## Effort & priority summary

| #    | Item                             | Effort   | Why                    |
| :--- | :------------------------------- | :------- | :--------------------- |
| P0.2 | Review prompt at completion      | half day | review volume          |
| P1.1 | CredibilityBadge on work cards   | half day | trust at a glance      |
| P1.2 | Public Reviews screen            | 1 day    | evidence               |
| P1.3 | In-app Report user               | 1 day    | safety                 |
| P1.4 | Verified badge (MVP)             | 1–2 days | founding-pro incentive |
| P2.1 | Review challenge window          | 2–3 days | fairness               |
| P2.2 | 24h edit window + no-delete      | half day | fairness               |
| P2.3 | Both-must-rate + collusion sweep | 1 day    | fairness               |
| P3.1 | Completed-works list             | 1 day    | evidence               |
| P3.2 | Review↔work context UI           | with 1.2 | evidence               |
| P4.1 | Admin trust queue                | 2 days   | operator leverage      |
| P4.2 | Report-threshold auto-hide       | half day | deterrent              |

**Sequencing rule:** P0 → P1 → P2 → P3 → P4, in order, and **stop after P1.4 for the
Sta. Barbara pilot**. P2–P4 are for the week you see the first unfair review or the
first report — they are column additions you can ship in a day because the models
already exist. Do not build them speculatively in Week 1.

**Weekly ritual (mirrors `MARKETING_STRATEGY.md` §14):** every Friday, log
(a) reviews submitted this week, (b) average rating, (c) reports received +
time-to-act, (d) challenges received + decided. If reviews/week ≈ 0, you have an
activation bug in P0.3, not a marketing problem. If reports/week suddenly spikes,
work the queue immediately — that is your community telling you the trust loop is
live.
