# Roadmap — Thalamus Feedback tickets
- [x] Migration: Feedback type, external_source/external_ref, bot member, numbering triggers skip Feedback, convert RPC, exclusions
- [x] Shared intake helper + thalamus-feedback edge function
- [x] Hide Feedback from normal lists/board/health
- [x] Feedback tab (only when integrated), Convert dialog, From Thalamus badge
- [x] AC generator reads discussion thread
- [x] Secret THALAMUS_FEEDBACK_SECRET + intake URL
- [x] Tests + docs
- [x] Accept and re-host optional Thalamus WebM recordings in the first discussion comment
- [x] Test and deploy recording support (9 tests passed)
- [x] Add shared overall status to Feedback details, list, filtering, grouping and bulk actions; 17 tests passed, preview compiles. Authenticated end-to-end checks unavailable with external unmanaged sign-in.

# Slow-connection ticket loading
- [x] Slim list payload without changing access/filter/sort rules
- [x] Progressive 200-ticket batches, cancellation/retries, deferred live refresh
- [x] Lazy acceptance criteria with safe editing, parent title hydration
- [x] Progress/counts and disable board drag during loading
- [x] Tests: 20 focused tests passed; full suite has unrelated bulk-assignment setup failures and a Playwright spec collected by Vitest
- [ ] Authenticated 3G verification — blocked by external unmanaged sign-in; no managed test session available
