-- Seed 100 cold-start submissions for the "test award" program
DO $$
DECLARE
  v_program_id uuid;
  i int;
  first_names text[] := ARRAY['Arun','Priya','Rahul','Deepa','Karthik','Meena','Vijay','Ananya','Suresh','Lakshmi',
    'Naveen','Divya','Rajesh','Sneha','Manoj','Kavitha','Sanjay','Pooja','Hari','Revathi',
    'Ashok','Nithya','Ganesh','Swathi','Mohan','Janani','Prakash','Roshni','Dinesh','Aparna'];
  last_names text[] := ARRAY['Kumar','Sharma','Patel','Reddy','Nair','Iyer','Das','Gupta','Singh','Joshi',
    'Menon','Verma','Rao','Pillai','Bhat','Hegde','Mishra','Shetty','Pandey','Agarwal'];
  fname text;
  lname text;
  subj text;
  topics text[] := ARRAY['AI Innovation','Green Energy','Healthcare Tech','EdTech Platform','FinTech Solution',
    'Smart Agriculture','Urban Mobility','Water Conservation','Waste Management','Digital Inclusion',
    'Mental Health App','Supply Chain','Cybersecurity Tool','AR/VR Learning','Accessibility'];
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE lower(title) LIKE '%test award%' LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Program "test award" not found';
  END IF;

  FOR i IN 1..100 LOOP
    fname := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    lname := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    subj := topics[1 + floor(random() * array_length(topics, 1))::int];

    INSERT INTO public.submissions (
      program_id, title, description, status,
      applicant_name, applicant_email, submission_data, submitted_at
    ) VALUES (
      v_program_id,
      subj || ' #' || i,
      'Submission entry ' || i || ' for ' || subj || ' by ' || fname || ' ' || lname,
      'pending',
      fname || ' ' || lname,
      lower(fname) || '.' || lower(lname) || i || '@example.com',
      jsonb_build_object('source', 'cold_start', 'index', i),
      now() - (random() * interval '30 days')
    );
  END LOOP;
END $$;
