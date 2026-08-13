CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  "rollNo" text NOT NULL UNIQUE,
  lat double precision,
  lng double precision,
  "lastSeen" timestamptz NOT NULL DEFAULT now(),
  "isOnline" boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can check in" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their location" ON public.students FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX students_lastseen_idx ON public.students ("lastSeen" DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;