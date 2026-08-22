-- A readiness drill is one ordered operational responsibility. D1 remains the
-- business authority; the Workflow instance only drives and recovers the
-- guarded operation.
CREATE TABLE staff_conquest_drill_orchestrations (
  operation_key TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL UNIQUE,
  accepted_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    workflow_instance_id =
      'conquest-readiness-drill-' || operation_key
  ),
  CHECK (
    strftime('%Y-%m-%dT%H:%M:%fZ', accepted_at) IS accepted_at
  ),
  CHECK (
    completed_at IS NULL OR (
      strftime('%Y-%m-%dT%H:%M:%fZ', completed_at) IS completed_at
      AND completed_at >= accepted_at
    )
  ),
  FOREIGN KEY (operation_key)
    REFERENCES staff_conquest_drill_operations(operation_key)
);

-- Adopt every valid active responsibility. Migration 0112 already guards the
-- operation state and its authoritative match counter; do not invent a new
-- attempt state or rewrite an in-flight drill.
INSERT INTO staff_conquest_drill_orchestrations
  (operation_key, workflow_instance_id, accepted_at, completed_at)
SELECT operation_key,
       'conquest-readiness-drill-' || operation_key,
       updated_at,
       NULL
FROM staff_conquest_drill_operations
WHERE status IN ('RUNNING', 'WAITING_DELIVERY');

CREATE TABLE conquest_drill_0128_migration_guard (
  violation_count INTEGER NOT NULL CHECK (violation_count = 0)
);

INSERT INTO conquest_drill_0128_migration_guard (violation_count)
SELECT COUNT(*)
FROM staff_conquest_drill_operations operation
LEFT JOIN staff_conquest_drill_orchestrations orchestration
  ON orchestration.operation_key = operation.operation_key
WHERE operation.status IN ('RUNNING', 'WAITING_DELIVERY')
  AND (
    orchestration.operation_key IS NULL
    OR orchestration.workflow_instance_id <>
       'conquest-readiness-drill-' || operation.operation_key
    OR orchestration.completed_at IS NOT NULL
  );

DROP TABLE conquest_drill_0128_migration_guard;

CREATE TRIGGER staff_conquest_drill_orchestration_insert_guard
BEFORE INSERT ON staff_conquest_drill_orchestrations
WHEN NEW.completed_at IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM staff_conquest_drill_operations operation
    WHERE operation.operation_key = NEW.operation_key
      AND operation.status IN ('RUNNING', 'WAITING_DELIVERY')
      AND operation.updated_at = NEW.accepted_at
  )
BEGIN
  SELECT RAISE(ABORT, 'active Conquest drill Workflow responsibility required');
END;

CREATE TRIGGER staff_conquest_drill_operation_orchestrate
AFTER UPDATE OF status ON staff_conquest_drill_operations
WHEN OLD.status = 'PREPARING' AND NEW.status = 'RUNNING'
BEGIN
  INSERT INTO staff_conquest_drill_orchestrations
    (operation_key, workflow_instance_id, accepted_at, completed_at)
  VALUES (
    NEW.operation_key,
    'conquest-readiness-drill-' || NEW.operation_key,
    NEW.updated_at,
    NULL
  );
END;

CREATE TRIGGER staff_conquest_drill_orchestration_complete
AFTER UPDATE OF status ON staff_conquest_drill_operations
WHEN NEW.status IN ('COMPLETED', 'FAILED')
  AND OLD.status NOT IN ('COMPLETED', 'FAILED')
BEGIN
  UPDATE staff_conquest_drill_orchestrations
  SET completed_at = NEW.completed_at
  WHERE operation_key = NEW.operation_key AND completed_at IS NULL;
END;

CREATE TRIGGER staff_conquest_drill_orchestration_update_guard
BEFORE UPDATE ON staff_conquest_drill_orchestrations
WHEN NEW.operation_key IS NOT OLD.operation_key
  OR NEW.workflow_instance_id IS NOT OLD.workflow_instance_id
  OR NEW.accepted_at IS NOT OLD.accepted_at
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM staff_conquest_drill_operations operation
    WHERE operation.operation_key = OLD.operation_key
      AND operation.status IN ('COMPLETED', 'FAILED')
      AND operation.completed_at = NEW.completed_at
  )
BEGIN
  SELECT RAISE(ABORT, 'valid terminal Conquest drill Workflow receipt required');
END;

CREATE TRIGGER staff_conquest_drill_orchestration_no_delete
BEFORE DELETE ON staff_conquest_drill_orchestrations
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill Workflow receipts are immutable');
END;

-- Infrastructure observations aid recovery but never advance or fail the
-- business operation. They deliberately contain no attempt count, retry
-- deadline, or terminal abandonment state.
CREATE TABLE staff_conquest_drill_orchestration_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL,
  workflow_instance_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (
    phase IN ('WORKFLOW_DISPATCH', 'WORKFLOW_VALIDATE', 'WORKFLOW_PROGRESS')
  ),
  failure_code TEXT NOT NULL CHECK (
    length(failure_code) BETWEEN 1 AND 128
    AND failure_code = trim(failure_code)
  ),
  observed_at TEXT NOT NULL CHECK (
    strftime('%Y-%m-%dT%H:%M:%fZ', observed_at) IS observed_at
  ),
  FOREIGN KEY (operation_key)
    REFERENCES staff_conquest_drill_operations(operation_key)
);

CREATE INDEX staff_conquest_drill_orchestration_failures_operation_idx
  ON staff_conquest_drill_orchestration_failures(
    operation_key, observed_at, id
  );

CREATE TRIGGER staff_conquest_drill_orchestration_failure_insert_guard
BEFORE INSERT ON staff_conquest_drill_orchestration_failures
WHEN NOT EXISTS (
  SELECT 1 FROM staff_conquest_drill_orchestrations orchestration
  WHERE orchestration.operation_key = NEW.operation_key
    AND orchestration.workflow_instance_id = NEW.workflow_instance_id
    AND orchestration.accepted_at <= NEW.observed_at
)
BEGIN
  SELECT RAISE(ABORT, 'authoritative Conquest drill Workflow failure required');
END;

CREATE TRIGGER staff_conquest_drill_orchestration_failures_no_update
BEFORE UPDATE ON staff_conquest_drill_orchestration_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill Workflow failures are immutable');
END;

CREATE TRIGGER staff_conquest_drill_orchestration_failures_no_delete
BEFORE DELETE ON staff_conquest_drill_orchestration_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill Workflow failures are immutable');
END;
