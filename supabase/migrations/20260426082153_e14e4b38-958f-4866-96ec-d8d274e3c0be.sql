-- Shift existing positions up by 1 to make room at position 1
UPDATE public.statuses SET position = position + 1;

-- Insert the new BACKLOG status at position 1
INSERT INTO public.statuses (name, position, color, category)
VALUES ('BACKLOG', 1, '#475569', 'backlog');
