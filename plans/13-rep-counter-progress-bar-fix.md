# Rep Counter and Progress Bar Fix

**Priority:** Bug  
**Date reported:** 21/04/2026

## Tasks

- [ ] Fix the progress bar so it reflects the correct number of remaining reps (e.g. 3-rep exercise should show Rest after rep 1, Rest after rep 2, and End after rep 3 — not End after rep 2)
- [ ] Increment the rep counter when the rest period **starts** (i.e. when the user taps Rest), not when it ends

## Context

With a 3-rep exercise the current behaviour shows: Rep 1 → Rest, Rep 2 → Rest, Rep 3 → **End** (one rep short). This is because the counter increments on rest completion rather than rest start, causing the last rep to be treated as the final action. The fix is to count the rep as done the moment the user signals rest, and only show End after all reps are exhausted.
