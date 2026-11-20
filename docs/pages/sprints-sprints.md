# Sprints — Sprints tab

**Default sub-tab of `/projects/:id/sprints`.** One block per sprint: number, dates, active/closed tag, team avatars, edit and delete.

- Two thin bars (FE, BE): committed hours (green) + planned hours (gold) against capacity; coral when over.
- Expanding a block lists each developer: FE/BE bar and "Xh committed · Yh planned / Zh", with "+Xh over" in coral. PMBAs edit capacity inline and add/remove people.
- Load = remaining hours (current estimate − actual, min 0) on tickets the person is assigned to that are Committed or Planned in that sprint. Closed sprints use the estimate.
- Clicking a sprint name makes it the working sprint and opens the Roadmap tab.
- Delete is blocked while the sprint has committed tickets; planned tickets go back to not planned.
- Editing dates is blocked if they overlap another sprint in the project.
- "Append next sprint block" adds the next 2-week sprint and copies the previous capacities.
