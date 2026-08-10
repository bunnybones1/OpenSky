-- +goose Up
-- +goose StatementBegin

ALTER TABLE account_stats ALTER CONSTRAINT account_stats_account_address_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE deck_ranks ALTER CONSTRAINT deck_ranks_highest_player_address_fkey DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE decks ALTER CONSTRAINT decks_account_address_fkey DEFERRABLE INITIALLY IMMEDIATE;

-- +goose StatementEnd
