ALTER TABLE public.ticket_estimate_changes
  ADD CONSTRAINT ticket_estimate_changes_ticket_id_fkey
    FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE,
  ADD CONSTRAINT ticket_estimate_changes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.team_members(id) ON DELETE SET NULL;