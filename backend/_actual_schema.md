# Actual Supabase Schema

This documents the actual database schema used by the Supabase instance at `https://okauzglpkrdatujkqczc.supabase.co`.

## Tables

### profiles
Stores all users (admin, teacher, student) in a single table. Replaces separate `users`, `teachers`, and `students` tables.

| Column        | Type         | Constraints                          |
|---------------|-------------|--------------------------------------|
| id            | UUID        | PK, default uuid_generate_v4()      |
| email         | TEXT        | NOT NULL                             |
| password_hash | TEXT        | NOT NULL                             |
| full_name     | TEXT        | NOT NULL                             |
| role          | TEXT        | NOT NULL (admin/teacher/student)     |
| phone         | TEXT        |                                      |
| avatar_url    | TEXT        |                                      |
| is_active     | BOOLEAN     | default true                         |
| created_at    | TIMESTAMPTZ |                                      |
| updated_at    | TIMESTAMPTZ |                                      |

### subjects

| Column      | Type         | Constraints                     |
|-------------|-------------|----------------------------------|
| id          | UUID        | PK                               |
| name        | TEXT        | NOT NULL                         |
| code        | TEXT        | NOT NULL                         |
| description | TEXT        |                                  |
| is_active   | BOOLEAN     | default true                     |
| created_at  | TIMESTAMPTZ |                                  |
| updated_at  | TIMESTAMPTZ |                                  |

### classes

| Column       | Type         | Constraints                     |
|-------------|-------------|----------------------------------|
| id           | UUID        | PK                               |
| name         | TEXT        | NOT NULL                         |
| subject_id   | UUID        | FK → subjects.id                 |
| teacher_id   | UUID        | FK → profiles.id                 |
| description  | TEXT        |                                  |
| max_students | INTEGER     | default 30                       |
| status       | TEXT        | default 'active'                 |
| start_date   | DATE        |                                  |
| end_date     | DATE        |                                  |
| created_at   | TIMESTAMPTZ |                                  |
| updated_at   | TIMESTAMPTZ |                                  |

### class_students

| Column      | Type         | Constraints                     |
|-------------|-------------|----------------------------------|
| id          | UUID        | PK                               |
| class_id    | UUID        | FK → classes.id                  |
| student_id  | UUID        | FK → profiles.id                 |
| enrolled_at | TIMESTAMPTZ |                                  |
| status      | TEXT        | default 'active'                 |

### lessons

| Column       | Type         | Constraints                     |
|-------------|-------------|----------------------------------|
| id           | UUID        | PK                               |
| class_id     | UUID        | FK → classes.id                  |
| title        | TEXT        | NOT NULL                         |
| content      | TEXT        |                                  |
| content_type | TEXT        | default 'text'                   |
| file_url     | TEXT        |                                  |
| youtube_url  | TEXT        |                                  |
| drive_url    | TEXT        |                                  |
| order_index  | INTEGER     | default 0                        |
| is_published | BOOLEAN     | default false                    |
| is_template  | BOOLEAN     | default false                    |
| created_by   | UUID        | FK → profiles.id                 |
| created_at   | TIMESTAMPTZ |                                  |
| updated_at   | TIMESTAMPTZ |                                  |

### assignments

| Column             | Type         | Constraints                                   |
|-------------------|-------------|------------------------------------------------|
| id                 | UUID        | PK                                             |
| class_id           | UUID        | FK → classes.id                                |
| lesson_id          | UUID        | FK → lessons.id                                |
| title              | TEXT        | NOT NULL                                       |
| description        | TEXT        |                                                |
| assignment_type    | TEXT        | default 'mixed' (essay/multiple_choice/mixed)  |
| due_date           | TIMESTAMPTZ |                                                |
| total_points       | INTEGER     | default 100                                    |
| is_published       | BOOLEAN     | default false                                  |
| is_template        | BOOLEAN     | default false                                  |
| time_limit_minutes | INTEGER     |                                                |
| created_by         | UUID        | FK → profiles.id                               |
| created_at         | TIMESTAMPTZ |                                                |
| updated_at         | TIMESTAMPTZ |                                                |

### assignment_questions

| Column         | Type         | Constraints                                          |
|---------------|-------------|------------------------------------------------------|
| id             | UUID        | PK                                                   |
| assignment_id  | UUID        | FK → assignments.id                                  |
| question_text  | TEXT        | NOT NULL                                             |
| question_type  | TEXT        | NOT NULL                                             |
| options        | JSONB       | Array of {text, is_correct} objects                  |
| correct_answer | TEXT        |                                                      |
| points         | INTEGER     | default 10                                           |
| order_index    | INTEGER     | default 0                                            |
| file_url       | TEXT        |                                                      |
| youtube_url    | TEXT        |                                                      |
| created_at     | TIMESTAMPTZ |                                                      |

### submissions

| Column        | Type         | Constraints                     |
|------------- |-------------|----------------------------------|
| id            | UUID        | PK                               |
| assignment_id | UUID        | FK → assignments.id              |
| student_id    | UUID        | FK → profiles.id                 |
| status        | TEXT        | default 'in_progress'            |
| score         | NUMERIC     |                                  |
| total_points  | NUMERIC     |                                  |
| auto_score    | NUMERIC     |                                  |
| manual_score  | NUMERIC     |                                  |
| feedback      | TEXT        |                                  |
| submitted_at  | TIMESTAMPTZ |                                  |
| started_at    | TIMESTAMPTZ | default now()                    |
| time_spent_seconds | INTEGER |                                  |
| graded_at     | TIMESTAMPTZ |                                  |
| graded_by     | UUID        | FK → profiles.id                 |
| created_at    | TIMESTAMPTZ |                                  |
| updated_at    | TIMESTAMPTZ |                                  |

### submission_answers

| Column              | Type         | Constraints                          |
|---------------------|-------------|--------------------------------------|
| id                  | UUID        | PK                                   |
| submission_id       | UUID        | FK → submissions.id                  |
| question_id         | UUID        | FK → assignment_questions.id         |
| answer_text         | TEXT        |                                      |
| selected_option_index| INTEGER    |                                      |
| is_correct          | BOOLEAN     |                                      |
| score               | NUMERIC     | default 0                            |
| feedback            | TEXT        |                                      |
| created_at          | TIMESTAMPTZ |                                      |
| updated_at          | TIMESTAMPTZ |                                      |

### schedules
Each row represents a single time slot (no separate schedule_slots table).

| Column      | Type         | Constraints                     |
|-------------|-------------|----------------------------------|
| id          | UUID        | PK                               |
| class_id    | UUID        | FK → classes.id                  |
| day_of_week | INTEGER     | NOT NULL                         |
| start_time  | TIME        | NOT NULL                         |
| end_time    | TIME        | NOT NULL                         |
| room_id     | UUID        | FK → facilities.id               |
| is_active   | BOOLEAN     | default true                     |
| created_at  | TIMESTAMPTZ |                                  |
| updated_at  | TIMESTAMPTZ |                                  |

### facilities
Hierarchical structure (buildings contain classrooms/labs). Replaces separate `rooms` table.

| Column     | Type         | Constraints                                |
|-----------|-------------|---------------------------------------------|
| id         | UUID        | PK                                          |
| name       | TEXT        | NOT NULL                                    |
| type       | TEXT        | default 'classroom' (building/classroom/lab)|
| parent_id  | UUID        | FK → facilities.id (self-referencing)       |
| capacity   | INTEGER     |                                             |
| equipment  | TEXT        |                                             |
| status     | TEXT        | default 'available'                         |
| address    | TEXT        |                                             |
| created_at | TIMESTAMPTZ |                                             |
| updated_at | TIMESTAMPTZ |                                             |

### finances
Category is plain text (no separate finance_categories table).

| Column         | Type         | Constraints                     |
|---------------|-------------|----------------------------------|
| id             | UUID        | PK                               |
| type           | TEXT        | NOT NULL (income/expense)        |
| category       | TEXT        | NOT NULL (plain text)            |
| amount         | NUMERIC     | NOT NULL                         |
| description    | TEXT        |                                  |
| reference_id   | UUID        |                                  |
| reference_type | TEXT        |                                  |
| payment_date   | DATE        | NOT NULL                         |
| payment_method | TEXT        |                                  |
| status         | TEXT        | default 'completed'              |
| created_by     | UUID        | FK → profiles.id                 |
| created_at     | TIMESTAMPTZ |                                  |
| updated_at     | TIMESTAMPTZ |                                  |

## Key Design Decisions

1. **Unified profiles table** — All users (admin, teacher, student) are in `profiles` with a `role` field
2. **No separate rooms** — Rooms are `facilities` with `type = 'classroom'` or `type = 'lab'`
3. **Flat schedules** — Each schedule row IS a time slot (no parent/child structure)
4. **JSONB options** — Question options stored as JSONB array in `assignment_questions.options`
5. **Plain text categories** — Finance categories are plain text, not a separate table
6. **Hierarchical facilities** — `parent_id` enables building → room hierarchy
7. **Stateless JWT auth** — No refresh_tokens table; tokens are verified by signature only
