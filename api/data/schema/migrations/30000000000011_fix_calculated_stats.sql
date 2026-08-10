-- +goose Up
-- +goose StatementBegin

ALTER TABLE public.deck_ranks ADD COLUMN tie_count INTEGER DEFAULT 0 NOT NULL;

DROP TRIGGER update_account_stats_trigger ON public.account_stats;
DROP FUNCTION public.update_account_stats;
DROP TRIGGER update_deck_stats_trigger ON public.deck_ranks;
DROP FUNCTION public.update_deck_stats;

CREATE FUNCTION public.update_account_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.games_played = (NEW.win_count + NEW.loss_count + NEW.tie_count);
        IF NEW.win_count = 0 THEN
            NEW.win_ratio = 0;
        ELSE
            NEW.win_ratio = NEW.win_count::real / NEW.games_played::real;
        END IF;

        RETURN NEW;
    END;
$$;

CREATE TRIGGER update_account_stats_trigger BEFORE INSERT OR UPDATE ON public.account_stats FOR EACH ROW EXECUTE PROCEDURE public.update_account_stats();

CREATE FUNCTION public.update_deck_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.games_played = (NEW.win_count + NEW.loss_count + NEW.tie_count);
        IF NEW.win_count = 0 THEN
            NEW.win_ratio = 0;
        ELSE
            NEW.win_ratio = NEW.win_count::real / NEW.games_played::real;
        END IF;

        RETURN NEW;
    END;
$$;

CREATE TRIGGER update_deck_stats_trigger BEFORE INSERT OR UPDATE ON public.deck_ranks FOR EACH ROW EXECUTE PROCEDURE public.update_deck_stats();

UPDATE account_stats SET games_played = win_count + loss_count + tie_count;
UPDATE deck_ranks SET games_played = win_count + loss_count + tie_count;

-- +goose StatementEnd

