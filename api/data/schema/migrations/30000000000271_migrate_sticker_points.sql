-- +goose Up
-- +goose StatementBegin

-- Update all friend points because previously it was only top 5 so some could be missing.
INSERT INTO levels_per_season (
    season,
    address,
    inviter_address,
    points_carried
) SELECT * FROM (
    SELECT
        season + 1 AS season,
        address,
        inviter_address,
        levels + points_carried - points_spent AS points_carried
    FROM levels_per_season
    WHERE season = 18 - 1
) AS carry
WHERE
    points_carried > 0
ON CONFLICT (
    address,
    season,
    inviter_address
) DO UPDATE SET points_carried = EXCLUDED.points_carried;

-- Convert friend points into sticker points
INSERT INTO items (
    account_address,
    item_type,
    token_id,
    balance
) SELECT
    account_address,
    303,
    1,
    balance
FROM (
    SELECT
        inviter_address AS account_address,
        SUM(levels + points_carried - points_spent) AS balance
    FROM levels_per_season
    WHERE season = 18
    GROUP BY inviter_address
) AS sticker_points
WHERE balance > 0
ON CONFLICT (
    account_address,
    item_type,
    token_id
) WHERE contract_address IS NULL
DO UPDATE SET balance = items.balance + EXCLUDED.balance;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE
FROM items
WHERE item_type = 303;

-- +goose StatementEnd
