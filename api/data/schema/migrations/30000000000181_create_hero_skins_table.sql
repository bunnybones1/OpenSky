-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE hero_skins
(
    id   SMALLINT PRIMARY KEY,
    hero SMALLINT NOT NULL
);

CREATE INDEX hero_skins_hero ON hero_skins (hero);

INSERT INTO hero_skins (id, hero) VALUES (1, 1);
INSERT INTO hero_skins (id, hero) VALUES (2, 2);
INSERT INTO hero_skins (id, hero) VALUES (3, 3);
INSERT INTO hero_skins (id, hero) VALUES (4, 4);
INSERT INTO hero_skins (id, hero) VALUES (5, 5);
INSERT INTO hero_skins (id, hero) VALUES (6, 6);
INSERT INTO hero_skins (id, hero) VALUES (7, 7);
INSERT INTO hero_skins (id, hero) VALUES (8, 8);
INSERT INTO hero_skins (id, hero) VALUES (9, 9);
INSERT INTO hero_skins (id, hero) VALUES (10, 10);
INSERT INTO hero_skins (id, hero) VALUES (11, 11);
INSERT INTO hero_skins (id, hero) VALUES (12, 12);
INSERT INTO hero_skins (id, hero) VALUES (13, 13);
INSERT INTO hero_skins (id, hero) VALUES (14, 14);
INSERT INTO hero_skins (id, hero) VALUES (15, 15);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE hero_skins;
