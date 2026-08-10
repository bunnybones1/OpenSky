use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    // Rule: The hero can't be withered.
    TriggerVariant::PhaseModifier(NOT_WITHERABLE),
    TriggerVariant::PhaseModifier(ARMOR_EFFECT),
    TriggerVariant::Early(SILENCE_HERO_ABILS),
    TriggerVariant::Early(BANNER_RECEIVER),
    TriggerVariant::Early(STEALTH_PREVENT_ATTACK),
    TriggerVariant::Early(GUARD_PREVENT_ATTACK),
    TriggerVariant::Normal(DASH_UNITS_DASH),
    TriggerVariant::Normal(APPLY_AT_TURN_END),
  ],
  on_play: None,
});

pub const SILENCE_HERO_ABILS: EarlyTrigger = EarlyTrigger {
  effect_type: EffectType::Internal,
  priority: 0,
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(PhaseAuraUpdate) = phase.try_into() {
        let owner = game.owner(my_id);
        let hero_abilities = game
          .player_cards(owner)
          .hero_ability()
          .iter()
          .copied()
          .collect_vec();
        for card in hero_abilities {
          let casts_or_triggers = game
            .player(owner)
            .hero_ability_casts_or_triggers_since_last_turn_start;
          let needs_silence = game
            .reveal_from_card(card, move |c| {
              let no_charges_left = c.charges.map_or(false, |c| c == 0);
              let none_per_turn_left = c.per_turn.map_or(false, |p| casts_or_triggers >= p.into());
              none_per_turn_left || no_charges_left
            })
            .await;
          if needs_silence {
            game
              .add_aura_modifier(card, card, Modifier::Silenced(true), 2)
              .await;
          }
        }
      }
    })
  },
};

pub const NOT_WITHERABLE: PhaseModifier = PhaseModifier {
  effect_type: EffectType::Internal,
  priority: 0,
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |_, my_id, phase, _| {
    Box::pin(async move {
      match <&PhaseDamage>::try_from(phase) {
        Ok(damage) if damage.target == my_id => Some(
          PhaseDamage {
            is_wither: false,
            ..*damage
          }
          .into(),
        ),
        _ => None,
      }
    })
  },
};

pub const BANNER_RECEIVER: EarlyTrigger = EarlyTrigger {
  effect_type: EffectType::Internal,
  priority: aura_order(true, AuraLayer::IncreaseStat),
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(PhaseAuraUpdate) = phase.try_into() {
        let owner = game.owner(my_id);
        let bonus_power = game
          .characters::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.traits.contains(&Trait::Banner))
          .count()
          * usize::from(game.player(owner).banner_size);
        game
          .add_aura_modifier(
            my_id,
            my_id,
            Modifier::ModifyPower(bonus_power as i8, Some(ModifyPowerReason::Banner)),
            0,
          )
          .await;
      }
    })
  },
};

attack_restriction!(
  HeroNotHitStealth,
  |defender: &CardInstance<SkyWeaver>, _field: &[InstanceID]| {
    !defender.traits.contains(&Trait::Stealth)
  }
);

pub const STEALTH_PREVENT_ATTACK: EarlyTrigger = EarlyTrigger {
  effect_type: EffectType::Internal,
  priority: aura_order(true, AuraLayer::Internal),
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(PhaseAuraUpdate) = phase.try_into() {
        let owner = game.owner(my_id);
        if !game.player(owner).this_turn_stats.hero_was_damaged {
          let enemy_chars: Vec<_> = game.characters::<InstanceID>(enemy(owner));
          for unit in enemy_chars {
            game
              .add_aura_modifier(
                unit,
                my_id,
                Modifier::GrantAttackRestrictions(indexset!(AttackRestriction::HeroNotHitStealth)),
                0,
              )
              .await;
          }
        }
      }
    })
  },
};

attack_restriction!(
  GuardOnField,
  |defender: &CardInstance<SkyWeaver>, _field: &[InstanceID]| { !defender.is_hero() }
);

pub const GUARD_PREVENT_ATTACK: EarlyTrigger = EarlyTrigger {
  effect_type: EffectType::Internal,
  priority: aura_order(false, AuraLayer::Internal),
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(PhaseAuraUpdate) = phase.try_into() {
        let owner = game.owner(my_id);
        let has_guard = game
          .characters::<&CardInstance<SkyWeaver>>(owner)
          .iter()
          .any(|c| c.traits.contains(&Trait::Guard));
        if !has_guard {
          return;
        }
        let enemy_chars: Vec<_> = game.characters::<InstanceID>(enemy(owner));
        for unit in enemy_chars {
          game
            .add_aura_modifier(
              unit,
              my_id,
              Modifier::GrantAttackRestrictions(indexset!(AttackRestriction::GuardOnField)),
              0,
            )
            .await;
        }
      }
    })
  },
};

attack_restriction!(Dash, |defender: &CardInstance<SkyWeaver>,
                           _: &[InstanceID]| {
  !defender.is_hero()
});

attachable_effect!(
  struct Dash {
    put_to_sleep: bool,
  },
  DASH,
  Effect::Unit {
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Internal,
      priority: aura_order(true, AuraLayer::Wake),
      is_active: |z, _| z.is_field(),
      run: |game, my_id, phase, effect_source| {
        Box::pin(async move {
          if let (Ok(PhaseAuraUpdate), CardEffect::Dash { put_to_sleep }) =
            (phase.try_into(), effect_source)
          {
            if put_to_sleep {
              return;
            }
            let (effect_active, didnt_attack) = game
              .reveal_from_card(my_id, |c| {
                (
                  c.attack_state == AttackState::Sleeping && c.traits.contains(&Trait::Dash),
                  !c.did_attack,
                )
              })
              .await;
            if !effect_active {
              return;
            }
            if didnt_attack && game.current_player == game.owner(my_id) {
              game
                .add_aura_modifier(
                  my_id,
                  my_id,
                  Modifier::GrantAttackRestrictions(indexset!(AttackRestriction::Dash)),
                  0,
                )
                .await;
              game
                .add_aura_modifier(
                  my_id,
                  my_id,
                  Modifier::SetAttackState(AttackState::Ready),
                  0,
                )
                .await;
            } else {
              game
                .add_aura_modifier(
                  my_id,
                  my_id,
                  Modifier::SetAttackState(AttackState::Exhausted),
                  0,
                )
                .await;
            }
          }
        })
      },
    }
    .into()],
    on_play: None
  }
);

pub const DASH_UNITS_DASH: NormalTrigger = NormalTrigger {
  effect_type: EffectType::Internal,
  priority: 2,
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, _, my_id, phase, _| {
    Box::pin(async move {
      let owner = game.owner(my_id);
      if let Ok(ResolvedPhaseMoveToZone {
        card,
        to: (_, Zone::Field),
        ..
      }) = phase.clone().try_into()
      {
        if game
          .reveal_from_card(card, |c| {
            c.traits.contains(&Trait::Dash)
              && !c.temporary_modifiers.iter().any(|m| {
                matches!(
                  m,
                  TemporaryModifier {
                    modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                    ..
                  }
                )
              })
          })
          .await
        {
          game
            .add_modifier(
              card,
              my_id,
              Modifier::GrantEffect(CardEffect::Dash {
                put_to_sleep: false,
              }),
              false,
              0,
            )
            .await;
        }
      } else if let Ok(ResolvedPhaseModifyCard {
        card: Card::ID(id),
        modifier: Modifier::GrantTrait(Trait::Dash),
        ..
      }) = phase.clone().try_into()
      {
        if game.units(owner).contains(&id) {
          let has_dash_eff = game
            .reveal_from_card(id, |c| {
              c.temporary_modifiers.iter().any(|m| {
                matches!(
                  m,
                  TemporaryModifier {
                    modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                    ..
                  }
                )
              })
            })
            .await;
          if !has_dash_eff {
            game
              .add_modifier(
                id,
                my_id,
                Modifier::GrantEffect(CardEffect::Dash {
                  put_to_sleep: false,
                }),
                false,
                0,
              )
              .await;
          }
        }
      } else if let Ok(ResolvedPhaseModifyCard {
        card: Card::ID(id),
        modifier: Modifier::SetTraits(traits),
        ..
      }) = phase.clone().try_into()
      {
        if traits.contains(&Trait::Dash) && game.units(owner).contains(&id) {
          let has_dash_eff = game
            .reveal_from_card(id, |c| {
              c.temporary_modifiers.iter().any(|m| {
                matches!(
                  m,
                  TemporaryModifier {
                    modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                    ..
                  }
                )
              })
            })
            .await;
          if !has_dash_eff {
            game
              .add_modifier(
                id,
                my_id,
                Modifier::GrantEffect(CardEffect::Dash {
                  put_to_sleep: false,
                }),
                false,
                0,
              )
              .await;
          }
        }
      } else if let Ok(ResolvedPhaseModifyCard {
        card: Card::ID(id),
        modifier: Modifier::SetAttackState(AttackState::Sleeping),
        ..
      }) = phase.clone().try_into()
      {
        if game.units(owner).contains(&id) {
          let has_dash_eff = game
            .reveal_from_card(id, |c| {
              c.temporary_modifiers.iter().any(|m| {
                matches!(
                  m,
                  TemporaryModifier {
                    modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                    ..
                  }
                )
              })
            })
            .await;
          if has_dash_eff {
            game
              .game
              .modify_card(id, |mut c| {
                c.remove_modifier(|c| {
                  matches!(
                    c,
                    &TemporaryModifier {
                      modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                      ..
                    }
                  )
                });
              })
              .await;
            game
              .add_modifier(
                id,
                my_id,
                Modifier::GrantEffect(CardEffect::Dash { put_to_sleep: true }),
                false,
                0,
              )
              .await;
          }
        }
      } else if let Ok(ResolvedPhaseModifyCard {
        card: Card::ID(id),
        modifier: Modifier::RemoveTrait(Trait::Dash),
        ..
      }) = phase.clone().try_into()
      {
        game
          .game
          .modify_card(id, |mut c| {
            c.remove_modifier(|c| {
              matches!(
                c,
                &TemporaryModifier {
                  modifier: Modifier::GrantEffect(CardEffect::Dash { .. }),
                  ..
                }
              )
            });
          })
          .await;
      }
    })
  },
};

// Any character on this unit's team with the Armor keyword takes 1 less damage from any source.
pub const ARMOR_EFFECT: PhaseModifier = PhaseModifier {
  effect_type: EffectType::Internal,
  priority: 0,
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      match <&PhaseDamage>::try_from(phase) {
        Ok(damage)
          if game
            .characters::<&CardInstance<SkyWeaver>>(game.owner(my_id))
            .into_iter()
            .any(|c| c.id() == damage.target && c.traits.contains(&Trait::Armor)) =>
        {
          Some(
            PhaseDamage {
              amount: damage.amount - 1,
              ..*damage
            }
            .into(),
          )
        }
        _ => None,
      }
    })
  },
};

pub const APPLY_AT_TURN_END: NormalTrigger = NormalTrigger {
  effect_type: EffectType::Internal,
  priority: 0,
  is_active: |zone, _| zone.is_field(), // continue working if silenced
  run: |game, queue, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
        if player == game.owner(my_id) {
          queue.add_resolution(move |game| {
            Box::pin(async move {
              let ids = get_public_modifiable_ids(game, player);
              for id in ids {
                let apply_at_sunset: Vec<_> = id
                  .instance(game, None)
                  .unwrap()
                  .temporary_modifiers
                  .iter()
                  .filter_map(|m| {
                    if let Modifier::ApplyAtTurnEnd(modifier) = &m.modifier {
                      Some(*modifier.clone())
                    } else {
                      None
                    }
                  })
                  .collect();
                if !apply_at_sunset.is_empty() {
                  game.modify_card(id, apply_at_sunset).await;
                }
              }
              game.context().mutate_secret(player, |secret| {
                let secret_ids = get_secret_modifiable_ids(&secret);
                for id in secret_ids {
                  let apply_at_sunset: Vec<_> = secret
                    .instance(id)
                    .unwrap()
                    .temporary_modifiers
                    .iter()
                    .filter_map(|m| {
                      if let Modifier::ApplyAtTurnEnd(modifier) = &m.modifier {
                        Some(*modifier.clone())
                      } else {
                        None
                      }
                    })
                    .collect();
                  for modifier in apply_at_sunset {
                    secret
                      .secret
                      .apply_modifier(id.into(), modifier, id, secret.log)
                      .unwrap();
                  }
                }
              });
            })
          })
        }
      }
    })
  },
};

fn get_public_modifiable_ids(game: &LiveGame, player: Player) -> Vec<InstanceID> {
  let public_hand = game.player_cards(player).hand().iter().flatten().copied();

  let field = game.characters::<InstanceID>(player).into_iter();

  public_hand
    .chain(field)
    .flat_map(|c| std::iter::once(c).chain(c.instance(game, None).unwrap().attachment()))
    .collect()
}

fn get_secret_modifiable_ids(
  secret: &card_movement_simulator::arcadeum::store::MutateSecretInfo<
    PlayerSecret<SkyWeaver>,
    card_movement_simulator::CardEvent<SkyWeaver>,
  >,
) -> Vec<InstanceID> {
  let secret_hand = secret.hand().iter().flatten().copied();

  let deck = secret.deck().iter().copied();

  secret_hand
    .chain(deck)
    .flat_map(|c| std::iter::once(c).chain(secret.instance(c).unwrap().attachment()))
    .collect()
}

#[test]
fn test_apply_at_turn_end() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_id = game.hero_id(0);
      game
        .grant_modifier_for_turns(
          hero_id,
          hero_id,
          Modifier::ApplyAtTurnEnd(Box::new(Modifier::ModifyHealth(99, None))),
          0,
          1,
        )
        .await;
      game.resolve_triggers().await;
      assert!(game.hero(0).health < 99);
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert!(game.hero(0).health >= 99);
    })
  })
}

#[test]
fn test_apply_at_turn_end_isnt_blocked_by_sky_keeper() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_id = game.hero_id(0);
      game
        .grant_modifier_for_turns(
          hero_id,
          hero_id,
          Modifier::ApplyAtTurnEnd(Box::new(Modifier::ModifyHealth(99, None))),
          0,
          1,
        )
        .await;
      game.resolve_triggers().await;
      assert!(game.hero(0).health < 99);
      game.instantiate_and_summon(0, BaseCard::C1091).await;
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert!(game.hero(0).health >= 99);
    })
  })
}

//Tavern Brawl Effects

serializable_filter!(SerializableFilter::IsUnit, |c| c.is_unit());

attachable_effect!(
  struct BleedDry();,
  BLEEDDRY,
  Effect::Unit {
    on_play: None,
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: |z, _| z.is_field(), // works while silenced.
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);

          if let Ok(PhaseResolveCardEffect {
            id,
            played_mana_cost,
            played_by_unit,
            ..
          }) = phase.try_into()
          {
            if played_by_unit || game.owner(id) != owner {
              return;
            }

            game
              .modify_card_single(
                my_id,
                Modifier::ModifyHealth(-(i8::from(played_mana_cost)), None),
              )
              .await;
            game.change_mana(owner, 99).await;
          }
        })
      },
    }
    .into()]
  }
);
attachable_effect!(
  struct TwoForOneUnits();,
  TWOFORONEUNITS,
  Effect::Unit {
    on_play: None,
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: |z, _| z.is_field(), // works while silenced.
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);

          if let Ok(PhaseResolveCardEffect {
            id, played_by_unit, ..
          }) = phase.try_into()
          {
            if played_by_unit
              || game.owner(id) != owner
              || game.reveal_from_card(id, |c| c.is_spell()).await
            {
              return;
            }
            if game.player_has_room_for_unit(owner) {
              let copy = game.copy_card(id, true).await;
              game.move_to_zone(copy, Zone::Field).await;
            }
          }
        })
      },
    }
    .into()]
  }
);
attachable_effect!(
  struct TwoForOneSpells();,
  TWOFORONESPELLS,
  Effect::Unit {
    on_play: None,
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: |z, _| z.is_field(), // works while silenced.
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);

          if let Ok(PhaseResolveCardEffect {
            id,
            target_id,
            played_mana_cost,
            played_by_unit,
            ..
          }) = phase.try_into()
          {
            if played_by_unit
              || game.owner(id) != owner
              || game.reveal_from_card(id, |c| c.is_unit()).await
            {
              return;
            }
            if match target_id {
              None => {
                //"Card does not target"
                true
              }
              Some(target_id)
                if {
                  let is_on_field = game
                    .location(target_id)
                    .location
                    .map(|l| l.0.is_field())
                    .unwrap_or(false);

                  !is_on_field
                } || {
                  let c = target_id
                    .instance(game, None)
                    .expect("Target doesn't exist.");
                  let can_be_targeted = if game.owner(target_id) == owner {
                    c.can_be_targeted_by_owner
                  } else {
                    c.can_be_targeted_by_enemy
                  };

                  !can_be_targeted
                } =>
              {
                //"Target isn't valid for this effect."
                false
              }
              _ => true,
            } {
              let copy = game.copy_card(id, true).await;
              game
                .modify_card_single(copy, Modifier::UnmarkForDeath)
                .await;
              let copy_id = game.reveal_from_card(copy, |c| c.id()).await;
              game.move_to_zone(copy, Zone::Casting).await;
              game
                .resolve_card_effect_as_unit(copy_id, target_id, played_mana_cost)
                .await;

              game.resolve_triggers().await;
              game.move_to_zone(copy, Zone::Graveyard).await;
            }
          }
        })
      },
    }
    .into()]
  }
);
attachable_effect!(
  struct Matryoska();,
  MATRYOSKA,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Continuous,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, _, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);

          if let Ok(ResolvedPhaseMoveToZone {
            card: dead_card,
            from:
              CardLocation {
                location: Some((Zone::Field, _)),
                ..
              },
            to: (_, Zone::Graveyard),
          }) = phase.try_into()
          {
            let (card_owner, cost) = game
              .reveal_from_card(dead_card, |c| (c.owner, c.cost))
              .await;
            if game.player_has_room_for_unit(owner) && owner == card_owner && cost != 0 {
              game
                .run(PhaseConjure {
                  from: owner,
                  to: (owner, Zone::Field),
                  predicate: Some(std::rc::Rc::new(move |c, _| {
                    c.is_unit() && c.cost == cost - 1
                  })),
                })
                .await;
              game.resolve_triggers().await;
            }
          }
        })
      }
    }
    .into()]
  }
);

serializable_filter!(SerializableFilter::C20013, |c| is_zomboid(*c.base()));
attachable_effect!(
  struct Horde(u8);,
  HORDE,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      // Causes Horde Boss to summun zomboids each turn
      NormalTrigger {
        effect_type: EffectType::Internal,
        priority: 0,
        is_active: is_on_field_not_silenced,
        run: |game, _, my_id, phase, card_effect| {
          Box::pin(async move {
            let owner = game.owner(my_id);

            if let (Ok(ResolvedPhaseStartTurn { player, .. }), CardEffect::Horde(horde_size)) =
              (phase.try_into(), card_effect)
            {
              if player == owner {
                for _ in 0..horde_size {
                  game.instantiate_and_summon(owner, BaseCard::C20013).await;
                }
              }
            }
          })
        }
      }
      .into(),
      PhaseModifier {
        effect_type: EffectType::Internal,
        priority: 0,
        is_active: is_on_field_not_silenced,
        run: |game, my_id, phase, _| {
          Box::pin(async move {
            match <&PhaseDamage>::try_from(phase) {
              Ok(damage) if damage.target == my_id => {
                let owner = game.owner(my_id);
                let prior_total_damage = game.player(owner).game_stats.total_horde_damage;

                game.player_mut(owner).game_stats.total_horde_damage =
                  prior_total_damage + u16::from(damage.amount);
                Some(PhaseDamage { ..*damage }.into())
              }
              _ => None,
            }
          })
        },
      }
      .into()
    ]
  }
);
attachable_effect!(
  struct CardSelection;,
  CARDSELECTION,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, _queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseResolveCardSelection {
            card_indices,
            player,
            is_init_card_selection,
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);
            if owner != player || !is_init_card_selection {
              return;
            }
            game.players[player as usize].done_card_selection = true;

            let move_to_deck_phases: Vec<_> = (0..game.player_cards(player).card_selection())
              .filter_map(|index| {
                if card_indices.contains(&index) {
                  None
                } else {
                  Some(PhaseMoveToZone {
                    card: game.card_selection_card(player, index),
                    player,
                    zone: Zone::Deck,
                  })
                }
              })
              .collect();

            game.run_parallel(move_to_deck_phases).await;

            game.context().mutate_secret(player, |secret| {
              secret.secret.card_selection_state = None;
            });

            let move_to_hand_phases: Vec<_> = (0..game.player_cards(player).card_selection())
              .map(|index| PhaseMoveToZone {
                card: game.card_selection_card(player, index),
                player,
                zone: Zone::Hand { public: false },
              })
              .collect();

            game.run_parallel(move_to_hand_phases).await;

            game.start_game_after_card_selection_completed().await;
          }
        })
      },
    }
    .into()],
  }
);
