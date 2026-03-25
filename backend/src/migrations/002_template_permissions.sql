-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);
