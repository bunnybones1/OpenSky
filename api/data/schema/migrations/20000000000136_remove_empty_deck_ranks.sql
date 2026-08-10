-- +goose Up
-- +goose StatementBegin
DELETE FROM deck_ranks WHERE deck_string IN (SELECT sub.deck_string AS deck_string FROM (SELECT deck_string, array_length(ARRAY(SELECT jsonb_array_elements_text(card_ids)), 1) AS card_count FROM deck_ranks WHERE games_played = 0) AS sub WHERE sub.card_count NOT IN (20, 30));
-- +goose StatementEnd

