ALTER TABLE public.categories
  DROP CONSTRAINT categories_parent_id_fkey;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.categories(id)
  ON DELETE CASCADE;