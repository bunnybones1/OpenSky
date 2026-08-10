
-- +goose Up
-- SQL in this section is executed when the migration is applied.
-- +goose StatementBegin
ALTER TABLE cards ADD COLUMN search_doc tsvector;
CREATE INDEX card_search_doc_idx ON cards USING gin(search_doc);

UPDATE cards SET search_doc = setweight(to_tsvector(name), 'A')    ||
                              setweight(to_tsvector(array_to_string(keywords, ' ')), 'A')    ||
                              setweight(to_tsvector(regexp_replace(description,'\{.*?\}',' ')), 'B')  ||
                              setweight(to_tsvector(array_to_string(ARRAY(SELECT jsonb_array_elements(attributes)->'value'->>'text'), ' ')), 'B');

CREATE FUNCTION update_card_search_doc() RETURNS trigger AS $update_card_search_doc$
    BEGIN
        NEW.search_doc =    setweight(to_tsvector(NEW.name), 'A') ||
                            setweight(to_tsvector(array_to_string(NEW.keywords, ' ')), 'A') ||
                            setweight(to_tsvector(regexp_replace(NEW.description,'\{.*?\}',' ')), 'B') ||
                            setweight(to_tsvector(array_to_string(ARRAY(SELECT jsonb_array_elements(NEW.attributes)->'value'->>'text'), ' ')), 'B');
        RETURN NEW;
    END;
$update_card_search_doc$ LANGUAGE plpgsql;


CREATE TRIGGER update_cards_search_doc_trigger
    BEFORE INSERT OR UPDATE
    ON cards
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_card_search_doc();

-- +goose StatementEnd

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
-- +goose StatementBegin
DROP TRIGGER update_cards_search_doc_trigger;
DROP FUNCTION public.update_card_search_doc();
ALTER TABLE cards DROP COLUMN search_doc;
-- +goose StatementEnd
