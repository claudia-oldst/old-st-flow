# Weekly hours bar

A thin horizontal strip beneath the top bar that shows the current user's logged hours for the current week.

## Layout
- Left: short label ("This week") and a numeric "X h / Y h" readout (logged vs. capacity).
- Center: a segmented progress bar broken down by day (Mon–Fri), each segment proportional to that day's logged hours, colour-coded for FE/BE/Project.
- Right: a small indicator pill ("On track", "Under", "Over") based on capacity.

## Interactions
- Hovering a day segment shows a tooltip with that day's breakdown by ticket.
- Clicking the bar opens the Logoff Summary dialog focused on the current week.
- The bar updates in real time as time logs are written, stopped, or edited anywhere in the app.

## Visibility
- Hidden on the public client portal and the login screen.
- Hidden for users with no team-member capacity configured.
