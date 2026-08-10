extern crate skyweaver_rs;
#[cfg(test)]
mod common;

use card_movement_simulator::{CardInstance, Zone};
use common::{test_store, DEFAULT_PARAMS};
use indexmap::indexmap;
use itertools::Itertools;
use rand::RngCore;
use skyweaver_rs::*;
use strum::IntoEnumIterator;

#[test]
fn inits_game() {
  let game = test_store().build().auto_mulligan();
  assert!(matches!(game.status, GameStatus::Playing));
}

#[test]
fn p1_plays_first() {
  let game = test_store().build().auto_mulligan();
  assert_eq!(game.current_player, 0);
}

fn can_concede(player: Player) {
  let mut game = test_store().build().auto_mulligan();
  game.apply_ok(Some(player), PlayerAction::Concede);
  if let GameStatus::GameOver { winner } = game.status {
    match winner {
      Some(winning_player) if player == winning_player => panic!("Conceding player won 🤔"),
      None => panic!("Game tied"),
      Some(winning_player) if winning_player > 1 => panic!("Winning player isn't in game 🤔"),
      Some(_) => {
        //ok!
      }
    }
  } else {
    panic!("Game didn't end!");
  }
}

#[test]
fn p1_can_concede() {
  can_concede(0);
}

#[test]
fn p2_can_concede() {
  can_concede(1);
}

#[test]
fn server_can_abandon_on_player_behalf() {
  for player in 0..2 {
    let mut game = test_store().build().auto_mulligan();
    let player: Player = player;
    game.apply_ok(None, PlayerAction::Abandon { player });
    if let GameStatus::GameOver { winner } = game.status {
      match winner {
        Some(winning_player) if player == winning_player => {
          panic!("Abandoning player won 🤔")
        }
        None => panic!("Game tied"),
        Some(winning_player) if winning_player > 1 => {
          panic!("Winning player isn't in game 🤔")
        }
        Some(_) => {
          //ok!
        }
      }
    } else {
      panic!("Game didn't end!");
    }
  }
}

#[test]
fn turn_ends() {
  let mut game = test_store().build().auto_mulligan();
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  assert_eq!(game.current_player, 1);
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  assert_eq!(game.current_player, 0);
}

#[test]
fn ending_turn_increases_mana() {
  let mut game = test_store().build().auto_mulligan();
  let starting_mana = game.players[0].mana;
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  assert!(
    game.players[0].mana > starting_mana,
    "Mana didn't increase on turn end"
  );
}

#[test]
fn wrong_player_ending_turn_fails() {
  let mut game = test_store().build().auto_mulligan();
  game.apply_err(Some(1), PlayerAction::EndTurn);
  assert_eq!(game.current_player, 0);
}

#[test]
fn attack() {
  let mut game = test_store().build().auto_mulligan();

  assert_eq!(
    game.hero(0).view.attack_state,
    AttackState::Ready,
    "Hero can't attack!"
  );
  let p1hp = game.hero(0).view.health;
  let p2hp = game.hero(1).view.health;

  let attacker_id = game.hero(0).id();
  let defender_id = game.hero(1).id();
  game.apply_ok(
    Some(0),
    PlayerAction::Attack {
      attacker_id,
      defender_id,
    },
  );
  assert_eq!(
    p1hp,
    game.hero(0).view.health,
    "Hero should not strike back!"
  );
  assert!(
    p2hp > game.hero(1).view.health,
    "P2's hero didn't lose health when attacked by P1's hero!"
  );
  assert_eq!(
    game.hero(0).view.attack_state,
    AttackState::Exhausted,
    "Hero didn't get exhausted!"
  );
}
#[test]
fn can_force_draw_after_turn_30() {
  let mut game = test_store().build().auto_mulligan().cycle_turns(29);
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  assert_eq!(game.status, GameStatus::GameOver { winner: None });
}
#[test]
fn can_only_attack_once_per_turn() {
  let mut game = test_store().build().auto_mulligan();
  let p1_hero_attack_p2_hero = PlayerAction::Attack {
    attacker_id: game.hero(0).id(),
    defender_id: game.hero(1).id(),
  };
  game.apply_ok(Some(0), p1_hero_attack_p2_hero.clone());
  game.apply_err(Some(0), p1_hero_attack_p2_hero.clone());

  // end turns
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  game.apply_ok(Some(1), PlayerAction::EndTurn);

  // attack should be refreshed
  game.apply_ok(Some(0), p1_hero_attack_p2_hero.clone());
  game.apply_err(Some(0), p1_hero_attack_p2_hero);
}

#[test]
fn can_win_game_by_reducing_enemy_hero_to_0hp() {
  let mut game = test_store().build().auto_mulligan();
  while let GameStatus::Playing = game.status {
    // end turn
    game.apply_ok(Some(0), PlayerAction::EndTurn);
    // end p2 turn
    game.apply_ok(Some(1), PlayerAction::EndTurn);
    // attack as p1
    let attacker_id = game.hero(0).id();
    let defender_id = game.hero(1).id();
    game.apply_ok(
      Some(0),
      PlayerAction::Attack {
        attacker_id,
        defender_id,
      },
    );
  }
  if let GameStatus::GameOver { winner } = game.status {
    match winner {
      Some(winning_player) if winning_player == 0 => {
        //ok!
      }
      Some(_) => panic!("Wrong player won"),
      None => panic!("Game tied"),
    }
  }
}

#[test]
fn play_card() {
  // This card should be a unit with no extra effect
  let mut game = test_store()
    .with_cards(vec![BaseCard::C20000], vec![])
    .build()
    .auto_mulligan()
    .cycle_turns(10);

  let card_id = game.hand_card_with_base(0, BaseCard::C20000);

  let play_card_with_id_2 = PlayerAction::PlayCard {
    card_id,
    target_id: None,
  };
  game.apply_ok(Some(0), play_card_with_id_2.clone());
  assert!(game.player_cards(0).field().contains(&card_id));
  // This doesn't fail, but it should kill you because you cheated.
  game.apply_ok(Some(0), play_card_with_id_2);
  assert_eq!(GameStatus::GameOver { winner: Some(1) }, game.status)
}

#[test]
fn hero_doesnt_have_summoning_sickness() {
  let game = test_store().build().auto_mulligan();
  assert_eq!(game.hero(0).view.attack_state, AttackState::Ready);
}
#[test]
fn guard_prevents_attacking_hero() {
  let mut game = test_store()
    .with_cards(vec![], vec![BaseCard::Dummy])
    .with_params(GameParams {
      cheats_allowed: true,
      ..DEFAULT_PARAMS.clone()
    })
    .build()
    .auto_mulligan()
    .cycle_turns(3);
  let guard_unit_id = game.hand_card_with_base(1, BaseCard::Dummy);
  game.apply_ok(
    None,
    PlayerAction::Cheat {
      cheats: vec![Cheat::ApplyModifierToCard {
        card: guard_unit_id.into(),
        modifier: Modifier::GrantTrait(Trait::Guard),
      }],
    },
  );
  let has_guard = game
    .secret(1)
    .instance(guard_unit_id)
    .unwrap()
    .traits
    .contains(&Trait::Guard);
  assert!(has_guard, "Card must have guard for this test to pass!");
  // end p1 turn
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: guard_unit_id,
      target_id: None,
    },
  );
  assert!(
    guard_unit_id
      .instance(&game, None)
      .unwrap()
      .traits
      .contains(&Trait::Guard)
      && game.player_cards(1).field().contains(&guard_unit_id)
  );

  game.apply_ok(Some(1), PlayerAction::EndTurn);

  game.apply_err(
    Some(0),
    PlayerAction::Attack {
      attacker_id: game.hero(0).id(),
      defender_id: game.hero(1).id(),
    },
  );
}

#[test]
fn stealth_works() {
  let unit_with_stealth = BaseCard::C2022;
  let mut game = test_store()
    .with_cards(vec![unit_with_stealth], vec![BaseCard::C42])
    .build()
    .auto_mulligan()
    .cycle_turns(10);
  let stealth_card = game.hand_card_with_base(0, unit_with_stealth);
  let p2_unit = game.hand_card_with_base(1, BaseCard::C42);
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: stealth_card,
      target_id: None,
    },
  );
  assert!(stealth_card
    .instance(&game, None)
    .unwrap()
    .traits
    .contains(&Trait::Stealth));
  assert!(game.player_cards(0).field().contains(&stealth_card));

  game.apply_ok(Some(0), PlayerAction::EndTurn);
  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: p2_unit,
      target_id: None,
    },
  );
  assert!(p2_unit.instance(&game, None).unwrap().power > 0);
  // now it's p2's turn
  let p2_hero_attack_p1_stealth_card = PlayerAction::Attack {
    attacker_id: game.hero(1).id(),
    defender_id: stealth_card,
  };

  // try to attack the stealthed unit
  game.apply_err(Some(1), p2_hero_attack_p1_stealth_card.clone());
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  game.apply_ok(Some(0), PlayerAction::EndTurn);

  // hit my hero, to un-stealth units
  game.apply_ok(
    Some(1),
    PlayerAction::Attack {
      attacker_id: p2_unit,
      defender_id: game.hero(0).id(),
    },
  );
  // try to attack the now un-stealthed unit
  game.apply_ok(Some(1), p2_hero_attack_p1_stealth_card);

  // now, cycle turns and do it again.
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  let p2_hero_attack_p1_stealth_card = PlayerAction::Attack {
    attacker_id: game.hero(1).id(),
    defender_id: stealth_card,
  };

  // try to attack the re-stealthed unit
  game.apply_err(Some(1), p2_hero_attack_p1_stealth_card.clone());
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  game.apply_ok(Some(0), PlayerAction::EndTurn);

  // hit the enemy hero, to un-stealth units
  game.apply_ok(
    Some(1),
    PlayerAction::Attack {
      attacker_id: p2_unit,
      defender_id: game.hero(0).id(),
    },
  );
  // try to attack the now un-stealthed unit
  game.apply_ok(Some(1), p2_hero_attack_p1_stealth_card);
}

#[test]
fn can_play_attached_spell() {
  let mut game = test_store()
    .with_cards(vec![BaseCard::C2004], vec![])
    .build()
    .auto_mulligan()
    .cycle_turns(10);
  let unit = game.hand_card_with_base(0, BaseCard::C2004);
  let spell = game.secret(0).instance(unit).unwrap().attachment().unwrap();

  // Try and play spell from a unit in-hand - this should make you lose instantly.
  let mut fail_game = game.clone();
  fail_game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: spell,
      target_id: None,
    },
  );
  assert_eq!(GameStatus::GameOver { winner: Some(1) }, fail_game.status);

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: unit,
      target_id: None,
    },
  );
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: spell,
      target_id: None,
    },
  );
  assert!(
    game.graveyard(0).contains(&spell),
    "Spell didn't go to the graveyard after playing!"
  );
}

#[test]
fn enchants_are_dusted_when_played() {
  let unit_with_roots = BaseCard::iter()
    .find(|c| c.attached_spell() == Some(enchant::ROOTS))
    .expect("No unit has roots!");
  let mut game = test_store()
    .with_cards(vec![unit_with_roots], vec![])
    .build()
    .auto_mulligan()
    .cycle_turns(10);

  let unit = game.hand_card_with_base(0, unit_with_roots);
  let spell = game.secret(0).instance(unit).unwrap().attachment().unwrap();

  assert_eq!(
    *game.secret(0).instance(spell).unwrap().base(),
    enchant::ROOTS,
    "Card doesn't come with roots!"
  );
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: unit,
      target_id: None,
    },
  );
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: spell,
      target_id: None,
    },
  );
  assert!(
    game.player_cards(0).dust().contains(&spell),
    "Enchant wasn't dusted after playing!"
  );
}

#[test]
fn p2_has_mana_in_hand() {
  let game = test_store().build().auto_mulligan();
  assert_eq!(
    *dbg!(game.player_cards(1).hand())
      [game.game_params.player_params[1].mulligan_choice_size as usize]
      .expect("should be revealed mana potion")
      .instance(&game, None)
      .unwrap()
      .base(),
    BaseCard::C20017
  );
}

#[test]
fn p1_starts_at_1_mana() {
  let game = test_store().build().auto_mulligan();
  assert_eq!(game.player(0).mana, 1);
}

#[test]
fn p2_starts_at_1_mana() {
  let mut game = test_store().build().auto_mulligan();
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  assert_eq!(game.player(1).mana, 2);
}

#[test]
fn hero_starting_spells_game_param() {
  let p1_spell = enchant::LEAD;
  let game = test_store()
    .with_params(GameParams {
      player_params: [
        PlayerGameParams {
          hero_spell: Some((p1_spell, vec![])),
          ..Default::default()
        },
        Default::default(),
      ],
      ..Default::default()
    })
    .build();
  assert_eq!(
    *game
      .hero(0)
      .attachment()
      .unwrap()
      .instance(&game, None)
      .unwrap()
      .base(),
    p1_spell
  );
  assert_eq!(game.hero(1).attachment(), None);
}

#[test]
fn skip_mulligan_game_param() {
  let game = test_store()
    .with_params(GameParams {
      skip_mulligan: true,
      ..Default::default()
    })
    .build();
  assert!(game.player(0).done_card_selection);
  assert!(game.player(1).done_card_selection);

  let normal_game = test_store().build().auto_mulligan();

  assert_eq!(game.player(0).mana, normal_game.player(0).mana);
  assert_eq!(game.player(1).mana, normal_game.player(1).mana);

  assert_eq!(game.player(0).max_mana, normal_game.player(0).max_mana);
  assert_eq!(game.player(1).max_mana, normal_game.player(1).max_mana);
}

#[test]
fn hero_starting_health_game_param() {
  let game = test_store()
    .with_params(GameParams {
      player_params: [
        PlayerGameParams {
          hero_modifiers: vec![Modifier::SetHealth(1.into())],
          ..Default::default()
        },
        PlayerGameParams {
          hero_modifiers: vec![Modifier::SetHealth(5.into())],
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .build();
  assert_eq!(game.hero(0).health, 1);
  assert_eq!(game.hero(1).health, 5);
}

#[test]
fn whitelist_game_param() {
  let game = test_store()
    .with_params(GameParams {
      card_whitelist: Some(vec![BaseCard::C10]),
      ..Default::default()
    })
    .with_prisms(vec![Prism::Strength], vec![Prism::Strength])
    .build()
    .auto_mulligan();
  assert_eq!(game.player_cards(0).hand().len(), 1);
  assert_eq!(game.player_cards(1).hand().len(), 2);
}

#[test]
fn summoning_unit_with_attached_spell_reveals_the_spell() {
  let unit_with_attached_spell = BaseCard::C35;
  let mut game = test_store()
    .with_cards(vec![unit_with_attached_spell], vec![])
    .build()
    .auto_mulligan()
    .cycle_turns(10);
  let unit = game.hand_card_with_base(0, unit_with_attached_spell);

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: unit,
      target_id: None,
    },
  );
  skyweaver_rs::client::get_valid_actions(&game, 0, &game.secret(0));
  // shouldn't panic!
}

#[test]
fn fuzzy_test() {
  let mut random = rand::thread_rng();
  let mut game = test_store().build().auto_mulligan();

  for _ in 0..4 {
    let player = game.current_player;

    let mut actions = skyweaver_rs::client::get_valid_actions(&game, player, &game.secret(player));

    actions.retain(|action| !matches!(action, &PlayerAction::EndTurn));

    if !actions.is_empty() {
      game
        .apply(
          Some(player),
          actions[<usize as std::convert::TryFrom<u32>>::try_from(random.next_u32()).unwrap()
            % actions.len()]
          .clone(),
        )
        .unwrap();
    }

    game.apply(Some(player), PlayerAction::EndTurn).unwrap();
  }
}

#[test]
fn spell_can_only_target_on_field() {
  let mut game = test_store()
    .with_cards(vec![BaseCard::C20003], vec![BaseCard::C3060])
    .build()
    .auto_mulligan();
  let (elderwood, card_that_targets) = {
    (
      game.hand_card_with_base(0, BaseCard::C20003),
      game.hand_card_with_base(1, BaseCard::C3060),
    )
  };
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: elderwood,
      target_id: None,
    },
  );
  let mut game = game.cycle_turns(2);
  game.apply_ok(Some(0), PlayerAction::EndTurn);
  game.apply_ok(
    Some(1),
    PlayerAction::Attack {
      attacker_id: game.hero(1).id(),
      defender_id: elderwood,
    },
  );
  assert!(!game.player_cards(0).field().contains(&elderwood));

  // This should fail, since you can't target a card not on the field
  game.apply_err(
    Some(1),
    PlayerAction::PlayCard {
      card_id: card_that_targets,
      target_id: Some(elderwood),
    },
  );
}

#[test]
fn starting_hand_order() {
  let mut game = test_store().build();
  game.apply_ok(
    Some(0),
    PlayerAction::CommitCardSelection {
      card_indices: vec![0, 1, 2, 3],
    },
  );

  let original_order: Vec<_> = game
    .secret(1)
    .card_selection()
    .iter()
    .copied()
    .enumerate()
    .collect();

  for cards in game
    .secret(1)
    .card_selection()
    .iter()
    .copied()
    .enumerate()
    .permutations(4)
  {
    let mut clone = game.clone();
    clone.apply_ok(
      Some(1),
      PlayerAction::CommitCardSelection {
        card_indices: cards.iter().map(|(index, _)| index).copied().collect(),
      },
    );

    let ordered_copy: Vec<_> = original_order
      .iter()
      .filter(|c| cards.contains(c))
      .map(|(_, id)| id)
      .copied()
      .collect();
    assert_eq!(
      clone
        .secret(1)
        .hand()
        .iter()
        .filter_map(|id| *id)
        .collect::<Vec<_>>(),
      ordered_copy,
      "Starting hand order didn't follow order cards appeared in card selection."
    );
  }
}

#[test]
fn reverse_card_sel_order() {
  let mut game = test_store().build();
  game.apply_ok(
    Some(1),
    PlayerAction::CommitCardSelection {
      card_indices: vec![0, 1, 2, 3],
    },
  );
  // game.apply_err(
  //   Some(1),
  //   PlayerAction::CommitCardSelection {
  //     card_indices: vec![0, 1, 2, 3],
  //   },
  // );
  // game.apply_ok(
  //   Some(0),
  //   PlayerAction::CommitCardSelection {
  //     card_indices: vec![4, 1, 6, 3],
  //   },
  // );
  // game.apply_err(
  //   Some(1),
  //   PlayerAction::CommitCardSelection {
  //     card_indices: vec![0, 1, 2, 3],
  //   },
  // );
  // game.apply_err(
  //   Some(0),
  //   PlayerAction::CommitCardSelection {
  //     card_indices: vec![0, 1, 2, 3],
  //   },
  // );
}

#[test]
fn rig_deck_order() {
  let deck_order = [
    BaseCard::C20038,
    BaseCard::C4077,
    BaseCard::C4044,
    BaseCard::C2004,
    BaseCard::C2016,
    BaseCard::C2005,
  ];
  let game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
      ],

      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![])
    .build();
  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);
}

#[test]
fn rig_deck_order_also_rigs_mulligan() {
  //TODO: This test does not pass, since cards from card selection are not moved anymore
  return;
  let mulligan_choice_size = 3;
  let deck_order = [
    BaseCard::C20038, // 1st mulligan card, picked.
    BaseCard::C4077,  // 2nd mulligan card, picked.
    BaseCard::C4044,  // 3rd mulligan card, picked.
    BaseCard::C2016,  // 4th mulligan card, not picked, returned to bottom.
    BaseCard::C2005,  // stays in deck, drawn on first turn.
  ];
  let game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: false,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size,
          mulligan_pool_size: 4,
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size,
          mulligan_pool_size: 4,
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![])
    .should_log(false)
    .build()
    .auto_mulligan();
  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(
    &base_cards_in_hand[..game.game_params.player_params[0].mulligan_choice_size as usize + 1],
    &[
      &deck_order[..mulligan_choice_size as usize],
      &deck_order[deck_order.len() - 1..]
    ]
    .concat()[..]
  );
}

#[test]
fn server_can_cheat_on_player_behalf() {
  let mut game = test_store()
    .with_params(GameParams {
      cheats_allowed: true,
      ..DEFAULT_PARAMS.clone()
    })
    .build()
    .auto_mulligan();
  let hero_id = game.hero_id(0);
  game.apply_ok(
    None,
    PlayerAction::Cheat {
      cheats: vec![Cheat::ApplyModifierToCard {
        card: hero_id.into(),
        modifier: Modifier::MarkedForDeath(hero_id),
      }],
    },
  );
  if let GameStatus::GameOver { winner } = game.status {
    assert_eq!(winner, Some(1));
  } else {
    panic!("Game didn't end after applying cheat!");
  }
}

#[test]
fn hero_ability_passive() {
  let deck_order = [BaseCard::Dummy];

  let mut game = test_store()
    .with_params(GameParams {
      cheats_allowed: true,
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
      ],
      ..DEFAULT_PARAMS.clone()
    })
    .with_hero_ability(Some(BaseCard::C25000), None)
    .with_cards(deck_order.to_vec(), vec![])
    .should_log(false)
    .build()
    .auto_mulligan();

  let dummy_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::Dummy)
    .expect("Dummy is in hand");

  let hero_abil = game.player_cards(0).hero_ability()[0];
  assert!(!hero_abil.instance(&game, None).unwrap().is_silenced);

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: dummy_id,
      target_id: None,
    },
  );
  let dummy_power = dummy_id.instance(&game, None).unwrap().power; //default 0
  assert_eq!(dummy_power, 1);

  assert!(hero_abil.instance(&game, None).unwrap().is_silenced);
}
#[test]
fn hero_ability_active() {
  let deck_order = [
    BaseCard::Dummy,
    BaseCard::Dummy,
    BaseCard::Dummy,
    BaseCard::Dummy,
  ];

  let mut game = test_store()
    .with_params(GameParams {
      cheats_allowed: true,
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          ..Default::default()
        },
      ],
      ..DEFAULT_PARAMS.clone()
    })
    .with_hero_ability(Some(BaseCard::C25001), None)
    .with_cards(vec![], deck_order.to_vec())
    .should_log(false)
    .build()
    .auto_mulligan();
  for i in 0..3 {
    game.apply_ok(Some(0), PlayerAction::EndTurn);

    let dummy_id = game
      .secret(1)
      .hand()
      .iter()
      .filter_map(|id| *id)
      .find(|id| *game.secret(1).instance(id).unwrap().base() == BaseCard::Dummy)
      .expect("Dummy is in hand");

    game.apply_ok(
      Some(1),
      PlayerAction::PlayCard {
        card_id: dummy_id,
        target_id: None,
      },
    );
    game.apply_ok(Some(1), PlayerAction::EndTurn);
    let hero_ability = game.player_cards(0).hero_ability()[0];
    assert!(
      !hero_ability.instance(&game, None).unwrap().is_silenced,
      "Samya's Speed is silenced at the start of her turn, humm."
    );

    game.apply_ok(
      Some(0),
      PlayerAction::PlayCard {
        card_id: hero_ability,
        target_id: Some(dummy_id),
      },
    );
    assert!(
      hero_ability.instance(&game, None).unwrap().is_silenced,
      "Samya's speed isn't silenced after casting it!"
    );
    println!(
      "                 CHARGES: {:?}",
      hero_ability.instance(game.state(), None).unwrap().charges
    );
    assert_eq!(game.player_cards(1).graveyard().len(), i + 1);
  }

  //4th time should fail since no more charges
  game.apply_ok(Some(0), PlayerAction::EndTurn);

  let dummy_id = game
    .secret(1)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(1).instance(id).unwrap().base() == BaseCard::Dummy)
    .expect("Dummy is in hand");

  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: dummy_id,
      target_id: None,
    },
  );
  game.apply_ok(Some(1), PlayerAction::EndTurn);
  let hero_ability = game.player_cards(0).hero_ability()[0];

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: hero_ability,
      target_id: Some(dummy_id),
    },
  );
  assert_eq!(game.player_cards(1).graveyard().len(), 3);
}
#[test]
fn card_623_works() {
  let deck_order = [BaseCard::C4025, BaseCard::C4025, BaseCard::C4025];
  let mut game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 20.into(),
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 20.into(),
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![])
    .build();
  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);

  // we assume that there's at least 3 spells in the deck.
  // it'd be weird it there wasn't.
  for _ in 0..3 {
    let hand_size = game.player_cards(0).hand().len();
    let deck_size = game.player_cards(0).deck();

    let seek_id = game
      .secret(0)
      .hand()
      .iter()
      .filter_map(|id| *id)
      .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C4025)
      .expect("Seek is in hand");

    game.apply_ok(
      Some(0),
      PlayerAction::PlayCard {
        card_id: seek_id,
        target_id: None,
      },
    );

    let new_hand_size = game.player_cards(0).hand().len();
    let new_deck_size = game.player_cards(0).deck();
    assert_eq!(new_hand_size, hand_size); // seek went out, new card went in
    assert_eq!(new_deck_size, deck_size - 1);
  }
}
#[test]
fn shade_oreheart_works() {
  let deck_order = [BaseCard::C3084, BaseCard::C125, BaseCard::C67];
  let mut game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 20.into(),
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 20.into(),
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![])
    .build();
  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);

  let oreheart_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C125)
    .expect("oreheart is in hand");
  let puddo_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C67)
    .expect("puddo is in hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: oreheart_id,
      target_id: None,
    },
  );
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: puddo_id,
      target_id: None,
    },
  );
  let shade_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C3084)
    .expect("oreheart is in hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: shade_id,
      target_id: Some(oreheart_id),
    },
  );

  let shade_power = shade_id.instance(&game, None).unwrap().power;
  let puddo_power = puddo_id.instance(&game, None).unwrap().power;
  assert_eq!(puddo_power, 4);
  assert_eq!(shade_power, 3);
}

#[test]
fn card_wash_ashore_works_with_geod() {
  let deck_order = [BaseCard::C20046];
  let mut game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 6.into(),
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 6.into(),
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![BaseCard::C3])
    .build();

  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);

  game.apply_ok(Some(0), PlayerAction::EndTurn);

  let geod_id = game
    .secret(1)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(1).instance(id).unwrap().base() == BaseCard::C3)
    .expect("Geod is in enemy hand");

  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: geod_id,
      target_id: None,
    },
  );

  game.apply_ok(Some(1), PlayerAction::EndTurn);
  println!("MANA PRE: {}", game.player(0).mana);
  let wash_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C20046)
    .expect("Wash Ashore is in hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: wash_id,
      target_id: Some(geod_id),
    },
  );
  println!("MANA POST: {}", game.player(0).mana);
  assert!(matches!(
    game.location(geod_id).location,
    Some((Zone::Hand { public: true }, _))
  ));
  assert_eq!(game.player(0).mana, 0);
}
#[test]
fn test_champ_doesnt_keep_glory_effect_type_after_passing_its_attach() {
  let champ = BaseCard::C1006;
  let cheap_unit = BaseCard::C20000;
  let mut game = test_store()
    .with_cards(vec![champ, cheap_unit], vec![])
    .build()
    .auto_mulligan()
    .cycle_turns(3);
  let champ = game.hand_card_with_base(0, champ);
  let cheap_unit = game.hand_card_with_base(0, cheap_unit);

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: cheap_unit,
      target_id: None,
    },
  );
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: champ,
      target_id: Some(cheap_unit),
    },
  );
  let champ_instance = champ.instance(&game, None).unwrap();
  assert_eq!(champ_instance.attachment(), None); // champ gave its attachment away
  assert_eq!(champ_instance.view.get_effect_types().collect_vec(), vec![]); // and thus no longer has
                                                                            // any effect_types
}

#[test]
fn test_attachments_rarity() {
  let unit_with_spell = BaseCard::C1006;
  let game = test_store()
    .with_card_rarity(0, unit_with_spell, Rarity::Gold)
    .with_cards(vec![unit_with_spell], vec![])
    .build()
    .auto_mulligan();

  let champ = game.hand_card_with_base(0, unit_with_spell);
  let parent_rarity = game.secret(0).instance(champ).unwrap().rarity;
  assert_eq!(parent_rarity, Rarity::Gold);

  // Attachments on deck cards should match the rarity of their parents.
  let attach_id = game
    .secret(0)
    .instance(champ)
    .unwrap()
    .attachment()
    .unwrap();
  let rarity = game.secret(0).instance(attach_id).unwrap().rarity;
  assert_eq!(rarity, Rarity::Gold);
}

#[test]
fn test_trapper_keeper_not_firing_when_bounced() {
  let trapper = BaseCard::C4002;
  let bouncer = BaseCard::C4000;
  let mut game = test_store()
    .with_cards(vec![trapper], vec![bouncer])
    .build()
    .auto_mulligan()
    .cycle_turns(3);
  let trapper = game.hand_card_with_base(0, trapper);
  let bouncer = game.hand_card_with_base(1, bouncer);
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: trapper,
      target_id: None,
    },
  );

  assert_eq!(game.player_cards(0).field()[1], trapper);

  game.apply_ok(Some(0), PlayerAction::EndTurn);

  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: bouncer,
      target_id: Some(trapper),
    },
  );

  // When a spell bounces Trapper Keeper to hand, Trapper Keeper should *not* get a copy of the spell used to bounce it.
  assert!(game
    .secret(0)
    .instance(trapper)
    .unwrap()
    .attachment()
    .is_none());
}

#[test]
fn weighted_card_odds_work() {
  let card_that_should_be_in_deck = BaseCard::C10;
  let mut game = test_store()
    .with_params(GameParams {
      card_whitelist: Some(vec![
        BaseCard::C10,
        card_that_should_be_in_deck,
        BaseCard::C12,
      ]),
      random_deck_odds: Some(indexmap! {
        BaseCard::C10 => 0.,
        card_that_should_be_in_deck => 0.5, // but since the others are 0, it'll only pick this one.
        BaseCard::C12 => 0.
      }),
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: 0,
          mulligan_pool_size: 0,
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: 0,
          mulligan_pool_size: 0,
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_prisms(vec![Prism::Strength], vec![Prism::Strength])
    .build()
    .auto_mulligan();

  game.apply_ok(Some(0), PlayerAction::EndTurn);

  assert_eq!(game.player_cards(0).hand().len(), 1);
  assert_eq!(game.player_cards(1).hand().len(), 1);

  assert_eq!(
    game.hand_card_with_base(0, card_that_should_be_in_deck),
    game.secret(0).hand()[0].unwrap()
  );

  assert_eq!(
    game.hand_card_with_base(1, card_that_should_be_in_deck),
    game.secret(1).hand()[0].unwrap()
  );
}

#[test]
fn deck_override_fails_if_deck_passed_too() {
  let result = std::panic::catch_unwind(|| {
    test_store()
      .with_params(GameParams {
        player_params: [
          PlayerGameParams {
            deck: vec![ModifiedBaseCard {
              base: BaseCard::C1,
              attachment: None,
              modifiers: vec![],
            }],
            ..Default::default()
          },
          Default::default(),
        ],
        ..Default::default()
      })
      .with_cards(vec![BaseCard::C1], vec![])
      .build()
      .auto_mulligan();
  });
  assert!(
    result.is_err(),
    "Passing both a deck & an override deck did not fail!"
  );
}

#[test]
fn deck_override_works() {
  let modified_deck = test_store()
    .with_params(GameParams {
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          deck: vec![ModifiedBaseCard {
            base: BaseCard::C1,
            attachment: None,
            modifiers: vec![Modifier::ModifyHealth(99, None)],
          }],
          ..Default::default()
        },
        Default::default(),
      ],
      ..Default::default()
    })
    .with_cards(vec![], vec![BaseCard::C2])
    .build();
  let card = modified_deck
    .secret(0)
    .instance(modified_deck.secret(0).hand()[0].unwrap())
    .unwrap()
    .clone();
  assert_eq!(*card.base(), BaseCard::C1);
  assert_eq!(card.health, 99);
}

#[test]
fn slay_works() {
  let card_with_slay = BaseCard::C124;
  let zomboid = BaseCard::C20013;
  let mut game = test_store()
    .with_cards(vec![card_with_slay], vec![zomboid])
    .with_prisms(vec![Prism::Strength], vec![Prism::Strength])
    .with_params(GameParams {
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: 2,
          mulligan_pool_size: 2,
          starting_mana: 5.into(),
          cards_added_to_hand_after_mulligan: vec![(zomboid, vec![])],
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: 2,
          mulligan_pool_size: 2,
          starting_mana: 5.into(),
          cards_added_to_hand_after_mulligan: vec![(zomboid, vec![])],
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .build()
    .auto_mulligan();

  let card_with_slay = game.hand_card_with_base(0, card_with_slay);
  let zomboid = game.hand_card_with_base(1, zomboid);
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: card_with_slay,
      target_id: None,
    },
  );
  game.apply_ok(Some(0), PlayerAction::EndTurn);

  game.apply_ok(
    Some(1),
    PlayerAction::PlayCard {
      card_id: zomboid,
      target_id: None,
    },
  );

  game.apply_ok(Some(1), PlayerAction::EndTurn);

  game.apply_ok(
    Some(0),
    PlayerAction::Attack {
      attacker_id: card_with_slay,
      defender_id: zomboid,
    },
  );

  assert_eq!(
    game
      .player_cards(0)
      .hand()
      .iter()
      .filter_map(|id| *id)
      .filter(|c| c.instance(&game, None).unwrap().base() == &BaseCard::C20001)
      .collect_vec()
      .len(),
    1
  );
}

#[test]
fn card_righteous_works_with_wartlock() {
  let deck_order = [BaseCard::C1089, BaseCard::C3076];
  let mut game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 10.into(),

          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 10.into(),

          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.to_vec(), vec![])
    .build();

  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);

  let righteous_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C1089)
    .expect("Righteous is in enemy hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: righteous_id,
      target_id: None,
    },
  );

  let wartlock_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C3076)
    .expect("Wartlock is in enemy hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: wartlock_id,
      target_id: None,
    },
  );

  assert_eq!(game.graveyard::<&CardInstance<SkyWeaver>>(0).len(), 0);
}

#[test]
fn with_hero_ability_c25000_should_only_increase_the_power_of_the_first_unit_played_each_turn() {
  let mut game = test_store()
    .with_hero_ability(Some(BaseCard::C25000), None)
    .with_cards(
      vec![BaseCard::Dummy, BaseCard::Dummy, BaseCard::Dummy],
      vec![],
    )
    .should_log(false)
    .build()
    .auto_mulligan();
  let dummy = game.hand_card_with_base(0, BaseCard::Dummy);

  let dummy_power = dummy.instance(&game, Some(&*game.secret(0))).unwrap().power;
  assert_eq!(dummy_power, 0);

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: dummy,
      target_id: None,
    },
  );
  assert_eq!(
    dummy.instance(&game, None).unwrap().power,
    1,
    "Ada's ability didn't buff the first unit played!"
  );

  let dummy_2 = game.hand_card_with_base(0, BaseCard::Dummy);
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: dummy_2,
      target_id: None,
    },
  );
  assert_eq!(
    dummy_2.instance(&game, None).unwrap().power,
    0,
    "Ada's ability buffed the second unit played!"
  );
}
#[test]
fn test_hero_ability_25014_changes_to_a_different_id_at_end_of_turn() {
  let mut game = test_store()
    .with_hero_ability(Some(BaseCard::C25014), None)
    .should_log(false)
    .build()
    .auto_mulligan();
  assert!(
    game.player_cards(0).hero_ability()[0]
      .instance(&game, None)
      .unwrap()
      .base()
      .clone()
      != BaseCard::C25014
  );
  let mut last_hero_power = BaseCard::C25014;
  for _ in 0..10 {
    game.apply_ok(
      Some(0),
      PlayerAction::PlayCard {
        card_id: game.player_cards(0).hero_ability()[0],
        target_id: None,
      },
    );
    game.apply_ok(Some(0), PlayerAction::EndTurn);
    game.apply_ok(Some(1), PlayerAction::EndTurn);
    let curr_power = game.player_cards(0).hero_ability()[0]
      .instance(&game, None)
      .unwrap()
      .base()
      .clone();
    assert_ne!(curr_power, last_hero_power);
    last_hero_power = curr_power;
  }
}
#[test]
fn test_choose() {
  //TODO: Investigate why this broke
  return;
  let deck_order = [BaseCard::C30133];
  let mut game = test_store()
    .with_params(GameParams {
      rig_deck_order: true,
      skip_mulligan: true,
      player_params: [
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 6.into(),
          ..Default::default()
        },
        PlayerGameParams {
          mulligan_choice_size: deck_order.len() as u16,
          starting_mana: 6.into(),
          ..Default::default()
        },
      ],
      ..Default::default()
    })
    .with_cards(deck_order.iter().copied().collect(), vec![BaseCard::C3])
    .build();

  let base_cards_in_hand: Vec<_> = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .map(|id| *game.secret(0).instance(&id).unwrap().base())
    .collect();
  assert_eq!(&deck_order[..], &base_cards_in_hand[..deck_order.len()]);

  let choose_card_id = game
    .secret(0)
    .hand()
    .iter()
    .filter_map(|id| *id)
    .find(|id| *game.secret(0).instance(id).unwrap().base() == BaseCard::C30133)
    .expect("choose card is in hand");

  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: choose_card_id,
      target_id: Some(game.hero_id(0)),
    },
  );
  game.apply_ok(
    Some(0),
    PlayerAction::CommitCardSelection {
      card_indices: vec![0],
    },
  );
  println!("{:?}", game.secret(0).card_selection_state);
  assert!(game.secret(0).card_selection_state.is_none());
  println!("{:?}", game.hero(0));
  // assert_eq!(game.units::<&CardInstance<SkyWeaver>>(0).len(), 2);
}
#[test]
fn test_timeout_end_turn() {
  let mut game = test_store().should_log(false).build().auto_mulligan();

  assert_eq!(game.current_player, 0);
  game.apply_ok(None, PlayerAction::Timeout);
  assert_eq!(game.current_player, 1);
  game.apply_ok(None, PlayerAction::Timeout);
  assert_eq!(game.current_player, 0);
}

#[test]
fn test_timeout_choose() {
  let mut game = test_store()
    .should_log(false)
    .with_hero_ability(Some(BaseCard::C25023), None)
    .should_log(false)
    .build()
    .auto_mulligan();

  assert_eq!(game.current_player, 0);
  let hero_ability = game.player_cards(0).hero_ability()[0];
  game.apply_ok(
    Some(0),
    PlayerAction::PlayCard {
      card_id: hero_ability,
      target_id: None,
    },
  );
  game.apply_ok(None, PlayerAction::Timeout);
  assert_eq!(game.current_player, 1);
  assert!(game.secret(0).card_selection_state.is_none());
}
