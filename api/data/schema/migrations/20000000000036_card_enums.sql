
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE cards
	ADD COLUMN class_enum SMALLINT DEFAULT 0 NOT NULL,
	ADD COLUMN element_enum SMALLINT DEFAULT 0 NOT NULL,
	ADD COLUMN status_enum SMALLINT DEFAULT 0 NOT NULL,
	ADD COLUMN type_enum SMALLINT DEFAULT 0 NOT NULL;

UPDATE cards SET class_enum = CASE
	WHEN LOWER(class) = 'str' THEN 0
	WHEN LOWER(class) = 'hrt' THEN 1
	WHEN LOWER(class) = 'agy' THEN 2
	WHEN LOWER(class) = 'int' THEN 3
	WHEN LOWER(class) = 'wis' THEN 4
	WHEN LOWER(class) = 'tok' THEN 5
END;
ALTER TABLE cards DROP COLUMN class;
ALTER TABLE cards RENAME COLUMN class_enum TO class;

UPDATE cards SET status_enum = CASE
	WHEN LOWER(status) = 'play' THEN 0
	WHEN LOWER(status) = 'blocked' THEN 1
	WHEN LOWER(status) = 'code' THEN 2
END;
ALTER TABLE cards DROP COLUMN status;
ALTER TABLE cards RENAME COLUMN status_enum TO status;

UPDATE cards SET element_enum = CASE
	WHEN LOWER(element) = 'water' THEN 0
	WHEN LOWER(element) = 'fire' THEN 1
	WHEN LOWER(element) = 'earth' THEN 2
	WHEN LOWER(element) = 'air' THEN 3
	WHEN LOWER(element) = 'mind' THEN 4
	WHEN LOWER(element) = 'metal' THEN 5
	WHEN LOWER(element) = 'light' THEN 6
	WHEN LOWER(element) = 'dark' THEN 7
END;
ALTER TABLE cards DROP COLUMN element;
ALTER TABLE cards RENAME COLUMN element_enum TO element;

UPDATE cards SET type_enum = CASE
	WHEN LOWER(type) = 'unit' THEN 0
	WHEN LOWER(type) = 'spell' THEN 1
END;
ALTER TABLE cards DROP COLUMN type;
ALTER TABLE cards RENAME COLUMN type_enum TO type;
