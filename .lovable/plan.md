# Internal-tool security context

## What changes
1. Save a project rule: this is an internal company tool. Everyone who can sign up is a colleague, so it's fine for every signed-in person to see other people's details and company data. Future security reviews will treat "every signed-in person can read this" as intended and won't flag it.
2. Dismiss the current warnings that only complain about colleagues seeing company data:
   - Ticket statuses list readable by every signed-in person (this is shared setup data)
   - Status rules readable by every signed-in person (this is shared setup data)
   - Ticket attachments viewable by every signed-in person (colleagues share files on tickets)
3. Leave the leaked-password warning active. It covers password strength, not who can see data, so the internal-tool rule doesn't apply. It also needs a paid backend plan to turn on.

## What stays protected
- Only signed-in people can see anything. The public and the client portal links get only what they're given today.
- The current limits on who can change things stay as they are, for example only PMBAs can approve estimates.

## Technical details
- Add a memory file (constraint) plus a Core line to the memory index.
- Ignore the three critical findings with ignore_security_finding, which asks you to approve. Dismissing a warning doesn't change any access rules in the database.
