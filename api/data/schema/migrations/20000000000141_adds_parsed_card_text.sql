-- +goose Up
-- +goose StatementBegin
ALTER TABLE cards ADD COLUMN parsed_description TEXT;

CREATE OR REPLACE FUNCTION update_card_search_doc() RETURNS trigger AS $$
    BEGIN
        NEW.search_doc =    setweight(to_tsvector(NEW.name), 'A') ||
                            setweight(to_tsvector(array_to_string(NEW.keywords, ' ')), 'A') ||
                            setweight(to_tsvector(regexp_replace(COALESCE(NEW.parsed_description, NEW.description),'\{.*?\}',' ')), 'B') ||
                            setweight(to_tsvector(array_to_string(ARRAY(SELECT jsonb_array_elements(NEW.attributes)->'value'->>'text'), ' ')), 'B');
        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_card_search_doc() RETURNS trigger AS $$
    BEGIN
        NEW.search_doc =    setweight(to_tsvector(NEW.name), 'A') ||
                            setweight(to_tsvector(array_to_string(NEW.keywords, ' ')), 'A') ||
                            setweight(to_tsvector(regexp_replace(NEW.description,'\{.*?\}',' ')), 'B') ||
                            setweight(to_tsvector(array_to_string(ARRAY(SELECT jsonb_array_elements(NEW.attributes)->'value'->>'text'), ' ')), 'B');
        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

ALTER TABLE cards DROP COLUMN parsed_description;
-- +goose StatementEnd
