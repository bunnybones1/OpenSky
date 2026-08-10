-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- XP Change
INSERT INTO notifications_onetime (
  name,
  data,
  filter,
  valid_from,
  expires_at
) VALUES (
  'XP_CHANGE_SKYPASS',
  '{"title": "YOUR LEVEL XP NOW REPRESENTS \n YOUR SKYPASS LEVEL", 
    "subtitle": "", 
    "background": "webapp/backgrounds/skypass-xp-level-notification.webp"
  }',
  '{"created_at": [{"<": "2023-01-16"}]}',
  null,
  '2023-06-01 01:00:00');  -- Expire in ~6 months
  


-- Silver cards in conquest
INSERT INTO notifications_onetime (
  name,
  data,
  filter,
  valid_from,
  expires_at
) VALUES (
  'SILVER_EXPANSION_IN_CONQUEST',
  '{
    "title": "SILVER CARDS FROM THE NEW EXPANSION \n CAN BE FOUND IN CONQUEST", 
    "subtitle": "NEW EXPANSION MEANS NEW CARDS!", 
    "background": "webapp/backgrounds/exbg-hexinv-conquest.webp"
  }',
  '{"created_at": [{"<": "2023-01-16"}]}',
  null,
  '2023-06-01 01:00:00'); -- Expire in ~6 months,
  


-- New Skypass Season
INSERT INTO notifications_onetime (
  name,
  data,
  filter,
  valid_from,
  expires_at
) VALUES (
  'SKYPASS_SEASON_01',
  '{
    "title": "HEXBOUND SEASON IS HERE! CHECK THE NEW REWARDS!", 
    "subtitle": "NEW SKYPASS SEASON ENDS ON FEBRUARY 13TH", 
    "background": "webapp/backgrounds/spbg-pablo-01-rewards.webp",
    "buttonText": "VIEW SKYPASS",
    "buttonPath": "/skypass"
  }',
  '{"age": [{">": "8h"}]}',
  null,
  '2023-02-13 14:00:00'); -- Expire when next season begins, Feb 13th at 14h UTC

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
