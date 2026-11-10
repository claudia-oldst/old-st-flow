# Thalamus 1.3.0 device details in Feedback tickets

Pulse already accepts reports from Thalamus 1.3.0. Its payload check doesn't look at the fields inside `environment`, so the new keys won't be rejected. The only change needed is how the first discussion comment shows those details.

## What changes
The **Context** section of the first comment on a Feedback ticket will list:
- Site, Page (same as now)
- **Browser:** for example "Chrome 128.0.6613.120"
- **OS:** for example "macOS 14.5.0"
- **Window:** for example "1440×813" (this replaces "Viewport")
- **Screen:** for example "1440×900 @2x" (pixel density is added when Thalamus sends it)
- **App version:** shows "Not set by the site" when Thalamus doesn't send one
- User agent (same as now)

If a report leaves out browser, OS or screen, those lines are skipped, so older reports still look fine.

## Technical details
- `thalamus-feedback/format.ts`: add `screen`, `pixel_ratio`, `browser` and `os` to the environment type, then render the lines above. Use the × sign for sizes and drop trailing zeros from pixel_ratio (2 shows as @2x, 1.8 as @1.8x).
- `format_test.ts`: one test for a full 1.3.0 environment and one for an older report without the new keys.
- Redeploy `thalamus-feedback`. Existing tickets stay as they are.

## Message for the Thalamus team
Confirmed: Pulse accepts `screen`, `pixel_ratio`, `browser` and `os` inside `environment`, and the bot comment now shows Browser, OS, Window, Screen and App version. You can publish.
