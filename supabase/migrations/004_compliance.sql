-- Compliance checks table
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  overall_score INTEGER, -- 0-100
  overall_status TEXT CHECK (overall_status IN ('passed','warning','failed')),
  passed_rules JSONB DEFAULT '[]',
  warning_rules JSONB DEFAULT '[]',
  failed_rules JSONB DEFAULT '[]',
  county TEXT DEFAULT 'mombasa',
  building_type TEXT,
  submission_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual rule results
CREATE TABLE compliance_rule_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES compliance_checks(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT CHECK (status IN ('passed','warning','failed')),
  actual_value TEXT,
  required_value TEXT,
  message TEXT,
  recommendation TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  reference TEXT -- NCA regulation reference
);

-- Indexes
CREATE INDEX idx_compliance_project ON compliance_checks(project_id);
CREATE INDEX idx_compliance_results_check ON compliance_rule_results(check_id);

-- RLS
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rule_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own compliance checks"
  ON compliance_checks FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users see own rule results"
  ON compliance_rule_results FOR ALL
  USING (
    check_id IN (
      SELECT id FROM compliance_checks WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );
