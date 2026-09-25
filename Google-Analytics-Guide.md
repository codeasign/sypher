# Google Analytics 4 — Sypher Next

Covers apps/web's GA4 setup: what the code already does, the GA4-console
steps needed to make it useful (this is the part that matters most — the
code captures everything, but GA4 won't break it down in reports until you
do these), and the full event/param reference to hand to data science and
growth.

## 1. What's already done in code

- **Consent Mode v2**: nothing is sent to GA until a visitor accepts the
  cookie banner (`CookieConsentBanner`). Analytics-storage defaults to
  `denied` on every page load.
- **`AnalyticsBootstrap`** loads `gtag.js` and no-ops entirely when
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset — safe to leave blank in any
  environment that shouldn't report (local dev, staging, preview builds).
- **`AnalyticsSession`** fires `page_view` on every route change (App
  Router doesn't reload the page, so gtag's own auto page-view only fires
  once without this) and keeps GA4's `user_id`/`user_role` in sync with the
  signed-in user.
- **~25 custom events** wired across auth, payments, courses, coding
  practice, mock exams, bookmarks, blog, and discussions — full list in
  section 4.

No further code changes are needed to start collecting data — everything
below is done in the GA4 web console (analytics.google.com), not this repo.

## 2. Get your Measurement ID

1. Go to [analytics.google.com](https://analytics.google.com).
2. If you don't have a GA4 property yet: **Admin** (gear icon, bottom left)
   → **Create Property** → name it "Sypher Next" → fill in business
   details → **Create**.
3. Under that property, add a **Web** data stream: **Admin** → **Data
   Streams** → **Add stream** → **Web** → enter your production URL (e.g.
   `https://next.sypher.local` or your real domain) → **Create stream**.
4. The stream's detail page shows a **Measurement ID** shaped like
   `G-XXXXXXXXXX`. Copy it.

## 3. Add it to Sypher Next

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` in:

- `apps/web/.env` for local dev (leave blank to keep local dev silent —
  recommended, so your own testing doesn't pollute real analytics)
- Your production environment's env vars (wherever `apps/web` is deployed)

No redeploy-specific code change needed — `AnalyticsBootstrap` reads this
at runtime. Restart the dev server (or redeploy) after setting it.

## 4. Register Custom Dimensions — do this, it's the important step

GA4 captures every event parameter below the moment traffic starts
flowing, but **it will not let you break down a report by any of them
until you register that parameter as a Custom Dimension.** Until you do
this, the data exists (and is queryable via BigQuery export if you link
one) but is invisible in the standard UI and in Explore.

**How, once per parameter:**
Admin → **Custom definitions** → **Custom dimensions** tab → **Create
custom dimension** → give it a readable **Dimension name** → **Scope:
Event** → pick the **Event parameter** (exact name from the table below,
case-sensitive) → **Save**. Takes about 30 seconds each.

Register these — this is the full list of custom parameters the code
sends:

| Dimension name (your choice) | Event parameter | Appears on | Why you want it |
|---|---|---|---|
| Signup/Login Method | `method` | `sign_up`, `login` | Email vs Google split |
| Upgrade Source | `source` | `upgrade_click`, `begin_checkout`, `purchase`, `payment_cancelled`, `payment_failed` | Which CTA (sidebar, PlanCard, GoProCard, locked-module notice, dashboard) actually converts |
| Failure Reason | `reason` | `payment_failed` | Why a payment failed |
| Bookmark Kind | `kind` | `bookmark_toggle` | course / module / coding_problem |
| Bookmark Action | `action` | `bookmark_toggle` | add / remove |
| Course ID | `course_id` | `course_view`, `bookmark_toggle` | |
| Course Slug | `course_slug` | `course_view`, `course_module_view` | **Popular courses** |
| Module Slug | `module_slug` | `course_module_view` | Popular modules within a course |
| Has Full Access | `has_full_access` | `course_view` | Free-preview vs paid viewer split |
| Started | `started` | `course_view` | New vs returning course visit |
| Post ID | `post_id` | `blog_post_view` | |
| Post Slug | `post_slug` | `blog_post_view` | **Popular blog posts** |
| Exam Code | `exam_code` | `mock_test_start`, `mock_test_submit` | Which exam |
| Score | `score` | `mock_test_submit` | (GA4 also lets you set this as a metric, not just a dimension) |
| Problem ID | `problem_id` | `coding_problem_open`, `coding_judge0_call`, `bookmark_toggle` | Popular coding problems |
| Difficulty | `difficulty` | `coding_problem_open` | Easy/medium/hard preference |
| Category | `category` | `coding_problem_open` | |
| Language | `language` | `coding_judge0_call` | Which language users code in |
| Call Type | `call_type` | `coding_judge0_call` | run / submit / custom |
| Cached | `cached` | `coding_judge0_call` | **Cost calc**: `false` = real billable Judge0/RapidAPI call, `true` = served from cache, no cost |
| Target Type | `target_type` | `comment_posted` | course / blogPost / video / courseModule |
| Is Reply | `is_reply` | `comment_posted` | Top-level comment vs reply |
| Profile Field | `field` | `profile_field_update` | avatar / bio / handle |

## 5. Mark Key Events (GA4's renamed "conversions")

Admin → **Events** → find `sign_up` and `purchase` in the list → toggle
**Mark as key event**. This makes them show up in the conversion-focused
reports and lets you set them as the goal in Explore funnels. Consider
also marking `begin_checkout` if you want checkout starts tracked as a
soft conversion.

(`sign_up` and `purchase` use GA4's own *recommended* event names — that's
deliberate, so they plug into GA4's built-in Acquisition and Monetization
reports automatically, without any Explore/custom-report work.)

## 6. Verify it's actually working

1. With a real Measurement ID set, open the site, accept the cookie
   banner, and click around (view a course, view a blog post).
2. In GA4: **Reports → Realtime** — you should see yourself as an active
   user within seconds, and the events firing in the event list.
3. For a deeper look at individual event parameters as they fire, use
   **Admin → DebugView** (requires the GA4 debugger extension or
   `?gtm_debug=1`, optional — Realtime is usually enough).
4. Standard reports (Acquisition, Engagement, etc.) take **24–48 hours**
   to start populating after first setup — this is normal GA4 behavior,
   not a bug.

**Caveat to keep in mind when reading any of these numbers**: anyone who
clicks "Reject Non-Essential" on the cookie banner is excluded entirely.
Real traffic will always run somewhat above what GA4 reports, by whatever
fraction of visitors decline. There's no way around this and it's correct
behavior (Consent Mode v2, GDPR-style).

## 7. Full event reference

Page views (`page_view`) fire automatically on every route — not listed
below. Everything else is a deliberate custom event.

| Event | Fires when | Key params |
|---|---|---|
| `sign_up` | Registration succeeds (email or Google OAuth) | `method` |
| `login` | Sign-in succeeds | `method` |
| `onboarding_completed` | First-login modal (handle/avatar/legal) finished | — |
| `course_view` | Course home page (`/learn/[slug]`) loads | `course_id`, `course_slug`, `has_full_access`, `started` |
| `course_module_view` | A lesson page loads | `course_slug`, `module_slug` |
| `blog_post_view` | A public blog post loads (not the admin editor's preview) | `post_id`, `post_slug` |
| `bookmark_toggle` | Course/module/coding-problem bookmarked | `kind`, `action`, plus the relevant id |
| `upgrade_click` | Any "Go Pro" CTA clicked | `source` |
| `begin_checkout` | Razorpay checkout opens | `value`, `currency`, `items`, `source` |
| `purchase` | Payment verified | `transaction_id`, `value`, `currency`, `items`, `source` |
| `payment_cancelled` | Checkout modal dismissed before completing | `source` |
| `payment_failed` | Checkout fails | `source`, `reason` |
| `mock_test_start` | Certification practice exam started | `exam_code`, `question_count` |
| `mock_test_submit` | Exam scored | `exam_code`, `score`, `correct_count`, `total_questions` |
| `coding_problem_open` | Practice problem page opened | `problem_id`, `difficulty`, `category` |
| `coding_judge0_call` | Run / Run Custom / Submit clicked in the coding IDE | `call_type` (run/submit/custom), `problem_id`, `language`, `cached`, `test_count`, `passed`, `error` |
| `comment_posted` | Discussion comment or reply posted | `target_type`, `target_id`, `is_reply` |
| `profile_field_update` | Avatar/bio/handle saved on the profile page | `field` |

## 8. Funnels you can build (GA4 Explore → Funnel exploration)

1. **Signup funnel**: `sign_up` → `onboarding_completed` → `course_view`
2. **Monetization funnel**: `upgrade_click` → `begin_checkout` →
   `purchase` (segment by `source` to compare CTA placements)
3. **Course engagement funnel**: `course_view` → `course_module_view` →
   `bookmark_toggle` / `mock_test_submit`
4. **Coding practice funnel**: `coding_problem_open` →
   `coding_judge0_call` (`call_type=run`) → `coding_judge0_call`
   (`call_type=submit`, `passed=true`)
5. **Content-to-community funnel**: `blog_post_view` / `course_view` →
   `comment_posted`

## 9. Judge0 cost calculation

`coding_judge0_call` was built specifically for this. Real (billable)
calls are rows where `cached = false` **and** `error` is absent — a `true`
`cached` value means the result was served from Sypher's own cache with no
RapidAPI call made, and `error: true` rows are ambiguous (may have been
blocked by rate-limit/quota before ever reaching Judge0, or may have
reached it and failed — the client can't always tell which). Treat
`error: true` rows as *cost-unknown*, not *definitely billed*.

```
billable_calls ≈ count(coding_judge0_call WHERE cached = false AND error is not set)
estimated_cost = billable_calls × your_per_call_rate
```
