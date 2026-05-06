
CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id, created_at);
CREATE INDEX idx_ticket_comments_parent ON public.ticket_comments(parent_id);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments readable by all" ON public.ticket_comments FOR SELECT USING (true);
CREATE POLICY "ticket_comments insertable by all" ON public.ticket_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "ticket_comments updatable by all" ON public.ticket_comments FOR UPDATE USING (true);
CREATE POLICY "ticket_comments deletable by all" ON public.ticket_comments FOR DELETE USING (true);

-- Enforce single-level replies
CREATE OR REPLACE FUNCTION public.enforce_comment_reply_depth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_parent uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT parent_id INTO parent_parent FROM public.ticket_comments WHERE id = NEW.parent_id;
  IF parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'Replies can only be one level deep';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_comment_reply_depth
  BEFORE INSERT OR UPDATE ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_reply_depth();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
ALTER TABLE public.ticket_comments REPLICA IDENTITY FULL;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ticket-attachments readable by all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket-attachments insertable by all"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket-attachments updatable by all"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket-attachments deletable by all"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ticket-attachments');
