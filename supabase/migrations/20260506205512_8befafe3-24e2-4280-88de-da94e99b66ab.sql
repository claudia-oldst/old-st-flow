
ALTER TABLE public.ticket_comments
  ADD CONSTRAINT ticket_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_comments
  ADD CONSTRAINT ticket_comments_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
