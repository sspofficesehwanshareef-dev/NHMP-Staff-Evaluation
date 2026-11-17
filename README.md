# NHMP Staff Performance Evaluation — starter project

## Included
- Responsive React web interface with dashboard, voting portal, staff register, officer register, schedule and reports.
- Demo mode works in one browser and saves demo changes in local browser storage.
- Supabase SQL starter schema with roles, unit assignments, posting history, evaluation rounds, identified votes and baseline row-level security policies.
- CSV export from the report screen.

## Run locally
1. Install Node.js (LTS).
2. Extract this ZIP.
3. In the project folder run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite.

## Important current limitation
This is a working UI prototype, not yet a deployed multi-user production system. Until Supabase is configured and the React screens are connected to it, demo data and votes remain in the current browser only. The demo officer selector is for testing only and is NOT authentication or access control.

## Connect Supabase
1. Create a Supabase project only after confirming departmental permission for cloud storage.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create Auth users for officers and managers; insert matching rows in `profiles` with the correct role and unit.
4. Copy `.env.example` to `.env` and enter the project URL and anon key.
5. Build the data-access layer and replace demo/localStorage operations with authenticated Supabase queries.
6. Add a server-side scheduled function (Supabase Edge Function + scheduled invocation) to open and close rounds. Never rely on a user's browser for automatic scheduling.
7. Add secure admin workflows for staff posting date ranges, officer assignments, and account deactivation.

## Business rules captured
- Units: LHQ / SP Office, Beat-01 Petaro, Beat-02 Sann, Beat-03 Sehwan.
- Officers can evaluate only staff who served in their unit during the evaluation month.
- Votes are officer-identified for SP/Admin reporting, but hidden from other officers.
- No remarks.
- Transfers are stored as separate dated posting records. Combined score should be weighted by the number of days served in each unit.
- Fixed opening and closing dates selected by administrator.

## Before production
- Confirm exact policy for partial-month posting overlap and whether every eligible officer must vote.
- Decide whether SP may edit schedules or only admin.
- Implement transaction-safe vote validation, full RLS tests, audit logs, backup/retention, MFA, and server-side report generation.
- Test February, 30/31-day months, transfers mid-month, overlapping posting records, deactivated officers and late submissions.
- Do not use real personnel information until security and departmental approval are complete.
