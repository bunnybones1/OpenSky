-- +goose Up
-- +goose StatementBegin
CREATE FUNCTION public.update_combined_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.combined_score = public.calculate_combined_score(NEW.player_rank::bigint, NEW.score::bigint, NEW.win_count::bigint, NEW.loss_count::bigint, NEW.abandon_count::bigint);
        RETURN NEW;
    END;
$$;

CREATE TRIGGER update_account_combined_score_trigger BEFORE INSERT OR UPDATE ON public.account_stats FOR EACH ROW EXECUTE FUNCTION public.update_combined_score();


UPDATE account_stats
  SET player_rank = 6
  WHERE
    player_rank = 7
    AND status NOT IN (1, 2)
    AND season = 13
    AND game_mode IN (1, 5);

WITH grandweavers AS (
  SELECT
    account_address,
    game_mode,
    season
  FROM account_stats
  WHERE
    game_mode = 5
    AND player_rank = 6
    AND season = 13
    AND status NOT IN (1, 2)
  ORDER BY
    calculate_combined_score(player_rank, score, win_count, loss_count, abandon_count) DESC LIMIT 100
) UPDATE
  account_stats AS stats
  SET
    player_rank = 7
  FROM grandweavers
  WHERE
    stats.account_address = grandweavers.account_address
    AND stats.game_mode = grandweavers.game_mode
    AND stats.season = grandweavers.season
;


WITH grandweavers AS (
  SELECT
    account_address,
    game_mode,
    season
  FROM account_stats
  WHERE
    game_mode = 1
    AND player_rank = 6
    AND season = 13
    AND status NOT IN (1, 2)
  ORDER BY
    calculate_combined_score(player_rank, score, win_count, loss_count, abandon_count) DESC LIMIT 100
) UPDATE
  account_stats AS stats
  SET
    player_rank = 7
  FROM grandweavers
  WHERE
    stats.account_address = grandweavers.account_address
    AND stats.game_mode = grandweavers.game_mode
    AND stats.season = grandweavers.season
;


-- +goose StatementEnd
