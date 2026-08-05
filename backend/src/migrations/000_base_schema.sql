-- Base schema (dumped from okauzglpkrdatujkqczc)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS assignment_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid,
  question_text text NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  correct_answer text,
  points integer DEFAULT 10,
  order_index integer DEFAULT 0,
  file_url text,
  youtube_url text,
  created_at timestamptz DEFAULT now(),
  toeic_meta jsonb
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid,
  lesson_id uuid,
  title text NOT NULL,
  description text,
  assignment_type text DEFAULT 'mixed'::text,
  due_date timestamptz,
  total_points integer DEFAULT 100,
  is_published boolean DEFAULT false,
  is_template boolean DEFAULT false,
  time_limit_minutes integer,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  allow_retake boolean DEFAULT false NOT NULL,
  max_attempts integer,
  listening_exam_mode boolean DEFAULT false NOT NULL,
  listening_answer_seconds integer DEFAULT 5 NOT NULL,
  listening_part34_answer_seconds integer DEFAULT 8 NOT NULL,
  listening_directions_seconds integer DEFAULT 25 NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  role varchar NOT NULL,
  status varchar DEFAULT 'absent'::character varying NOT NULL,
  note text,
  marked_at timestamptz,
  marked_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid,
  student_id uuid,
  date date NOT NULL,
  status varchar DEFAULT 'present'::character varying,
  note text,
  marked_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  lesson_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  schedule_id uuid,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  topic text,
  status varchar DEFAULT 'scheduled'::character varying NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  lesson_id uuid,
  review_content text,
  review_students text,
  review_followup text,
  review_submitted_at timestamptz,
  review_submitted_by uuid
);

CREATE TABLE IF NOT EXISTS class_students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid,
  student_id uuid,
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active'::text,
  enrollment_date date DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject_id uuid,
  teacher_id uuid,
  description text,
  max_students integer DEFAULT 30,
  status text DEFAULT 'active'::text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  fee_policy varchar,
  fee_amount numeric(12,2) DEFAULT 0,
  billing_day smallint DEFAULT 1,
  sessions_per_period smallint DEFAULT 0,
  teacher_pay_policy varchar,
  teacher_pay_amount numeric(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  student_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  status varchar DEFAULT 'pending'::character varying NOT NULL,
  note text,
  review_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text DEFAULT 'classroom'::text,
  parent_id uuid,
  capacity integer,
  equipment text,
  status text DEFAULT 'available'::text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  payment_date date NOT NULL,
  payment_method text,
  status text DEFAULT 'completed'::text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  subject_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid,
  title text NOT NULL,
  content text,
  content_type text DEFAULT 'text'::text,
  file_url text,
  youtube_url text,
  drive_url text,
  order_index integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_template boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid,
  sender_id uuid,
  type varchar NOT NULL,
  title text NOT NULL,
  message text,
  reference_type varchar,
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid,
  subject_id uuid,
  question_text text NOT NULL,
  question_type varchar DEFAULT 'essay'::character varying,
  options jsonb,
  correct_answer text,
  points numeric DEFAULT 10,
  difficulty varchar DEFAULT 'medium'::character varying,
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  label text,
  question_text text DEFAULT ''::text NOT NULL,
  question_type text DEFAULT 'multiple_choice'::text NOT NULL,
  options jsonb,
  correct_answer text,
  points integer DEFAULT 1 NOT NULL,
  file_url text,
  youtube_url text,
  file_storage_path text,
  audio_storage_path text,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  skill text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  start_date date,
  end_date date
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_answers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id uuid,
  question_id uuid,
  answer_text text,
  selected_option_index integer,
  is_correct boolean,
  points_earned numeric DEFAULT 0,
  feedback text,
  created_at timestamptz DEFAULT now(),
  score numeric(6,2),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid,
  student_id uuid,
  status text DEFAULT 'in_progress'::text,
  score numeric,
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid,
  created_at timestamptz DEFAULT now(),
  auto_score numeric(6,2),
  manual_score numeric(6,2),
  total_points numeric(6,2),
  started_at timestamptz DEFAULT now(),
  time_spent_seconds integer,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_pay_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL,
  session_id uuid,
  pay_policy varchar NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  description text,
  period_start date,
  period_end date,
  status varchar DEFAULT 'pending'::character varying NOT NULL,
  finance_id uuid,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS template_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type varchar NOT NULL,
  template_id uuid NOT NULL,
  teacher_id uuid,
  granted_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(12,2) DEFAULT 0 NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  period_start date,
  period_end date,
  attachment_urls text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS tuition_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no varchar,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  fee_policy varchar NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  discount numeric(12,2) DEFAULT 0 NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
  balance numeric(12,2) DEFAULT 0 NOT NULL,
  status varchar DEFAULT 'unpaid'::character varying NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  attachment_urls text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS tuition_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no varchar,
  invoice_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_method varchar DEFAULT 'cash'::character varying NOT NULL,
  paid_at timestamptz DEFAULT now() NOT NULL,
  collected_by uuid,
  finance_id uuid,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  transfer_image_url text
);

