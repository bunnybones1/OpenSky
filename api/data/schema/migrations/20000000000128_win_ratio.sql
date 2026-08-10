-- +goose Up
-- +goose StatementBegin

ALTER TABLE deck_ranks ADD COLUMN games_played INTEGER DEFAULT 0 NOT NULL;
UPDATE deck_ranks SET games_played = (win_count + loss_count + forfeit_count + abandon_count);
ALTER TABLE deck_ranks ADD COLUMN win_ratio real DEFAULT 0 NOT NULL;
UPDATE deck_ranks SET win_ratio = win_count::real / games_played::real WHERE win_count > 0;

CREATE FUNCTION public.update_deck_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.games_played = (NEW.win_count + NEW.loss_count + NEW.forfeit_count + NEW.abandon_count);
        IF NEW.win_count = 0 THEN
            NEW.win_ratio = 0;
        ELSE
            NEW.win_ratio = NEW.win_count::real / NEW.games_played::real;
        END IF;

        RETURN NEW;
    END;
$$;

CREATE TRIGGER update_deck_stats_trigger BEFORE INSERT OR UPDATE ON public.deck_ranks FOR EACH ROW EXECUTE PROCEDURE public.update_deck_stats();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER update_deck_stats_trigger;
DROP FUNCTION public.update_deck_stats;
ALTER TABLE deck_ranks DROP COLUMN win_ratio;
ALTER TABLE deck_ranks DROP COLUMN games_played;

-- +goose StatementEnd
