-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Play the game before March 30th 2023
INSERT INTO tasks (queue, payload, hash, account_address)
SELECT
    'giveaway-offchain-tokens',
    convert_to(
        jsonb_build_object(
            'accountAddress', address,
            'tokens', jsonb_build_object(
                '302', jsonb_build_object('1', 1)
            ),
            'createdAt', '2023-03-30T00:00:00Z'
        )::text,
        'UTF-8'
    ),
    CONCAT(address, '-0'),
    address
FROM accounts
WHERE created_at < '2023-04-01'
ON CONFLICT (queue, hash) DO NOTHING;

-- Buy the Premium Skypass before March 30th 2023
INSERT INTO tasks (queue, payload, hash, account_address)
SELECT DISTINCT
    'giveaway-offchain-tokens',
    convert_to(
            jsonb_build_object(
                    'accountAddress', account_address,
                    'tokens', jsonb_build_object(
                            '302', jsonb_build_object('2', 1)
                        ),
                    'createdAt', '2023-03-30T00:00:00Z'
                )::text,
            'UTF-8'
        ),
    CONCAT(account_address, '-1'),
    account_address
FROM skypass_season_stats
WHERE has_premium = true
ON CONFLICT (queue, hash) DO NOTHING;
