-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX decks_deck_string_idx ON decks USING HASH(deck_string);
CREATE INDEX deck_ranks_deck_string_idx ON deck_ranks USING HASH(deck_string);

CREATE INDEX matches_winning_player_idx ON matches(winning_player);
CREATE INDEX matches_p1_deck_string_idx ON matches USING HASH(p1_deck_string);
CREATE INDEX matches_p2_deck_string_idx ON matches USING HASH(p2_deck_string);

CREATE INDEX matches_ended_at_idx ON matches(ended_at);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX decks_deck_string_idx;
DROP INDEX deck_ranks_deck_string_idx;

DROP INDEX matches_winning_player_idx;
DROP INDEX matches_p1_deck_string_idx;
DROP INDEX matches_p2_deck_string_idx;

DROP INDEX matches_ended_at_idx;
