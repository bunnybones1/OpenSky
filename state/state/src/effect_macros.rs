#[macro_export]
macro_rules! many {
  ( $first:expr, $($x:expr),* ) => {
    std::iter::once($first)
    $(
      .chain(std::iter::once($x))
    )*
  };
}
#[macro_export]
macro_rules! xcost_internal {
  ($public_run:expr, $secret_run:expr, $layer:expr) => {
    vec![
      EarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(true, $layer),
        is_active: |zone, _card| {
          matches!(
            zone,
            Zone::Attachment { .. }
              | Zone::Hand { public: true }
              | Zone::Limbo { public: true }
              | Zone::Casting
          )
        }, // ignore card, because we still run if silenced
        run: $public_run,
      }
      .into(),
      SecretEarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(true, $layer),
        is_active: |zone, _card| {
          matches!(
            zone,
            Zone::Attachment { .. } | Zone::Hand { public: false } | Zone::Limbo { public: false }
          )
        }, // ignore card, because we still run if silenced
        run: $secret_run,
      }
      .into(),
    ]
  };
}

#[macro_export]
macro_rules! xcost_internal_0c_in_deck {
  ($public_run:expr, $secret_run:expr, $layer:expr) => {
    vec![
      EarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(true, $layer),
        is_active: |zone, _card| {
          matches!(zone, Zone::Attachment { .. } | Zone::Hand { public: true } | Zone::Limbo { public: true } | Zone::Casting)
        }, // ignore card, because we still run if silenced
        run: $public_run,
      }
      .into(),
      SecretEarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(true, $layer),
        is_active: |zone, _card| {
          matches!(zone, Zone::Attachment { .. } | Zone::Hand { public: false } | Zone::Limbo { public: false })
        }, // ignore card, because we still run if silenced
        run: $secret_run,
      }
      .into(),
      SecretEarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(true, $layer),
        is_active: |zone, _card| {
          matches!(zone, Zone::Deck)
        }, // ignore card, because we still run if silenced
        run: |_game, secret, _, log, my_id, phase| {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            secret
              .modify_card(my_id, log, |mut c| {
                c.add_xcost_modifier(my_id, Modifier::SetCost(0.into()))
              })
              .expect("Modify can't fail because my_id is always in secret.");
          }
        },
      }
      .into(),
    ]
  };
}
#[macro_export]
macro_rules! xcost_set {
  ($public_run:expr) => {
    xcost_internal_0c_in_deck!(
      |game, my_id, phase| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let cost: $crate::saturating_u8::SaturatingU8 = ($crate::utils::public_xcost_helper::<
              _,
              $crate::saturating_u8::SaturatingU8,
            >($public_run))(game, my_id);
            game
              .game
              .modify_card(my_id, |mut c| {
                c.add_xcost_modifier(my_id, Modifier::SetCost(cost))
              })
              .await;
          }
        })
      },
      |game, secret, _, log, my_id, phase| {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let cost: $crate::saturating_u8::SaturatingU8 = ($crate::utils::public_xcost_helper::<
            _,
            $crate::saturating_u8::SaturatingU8,
          >($public_run))(game, my_id);
          secret
            .modify_card(my_id, log, |mut c| {
              c.add_xcost_modifier(my_id, Modifier::SetCost(cost))
            })
            .expect("Modify can't fail because my_id is always in secret.");
        }
      },
      AuraLayer::SetCost
    )
  };
  ($public_run:expr, $secret_run:expr) => {
    xcost_internal_0c_in_deck!(
      |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let cost: $crate::saturating_u8::SaturatingU8 = ($crate::utils::xcost_helper::<
              _,
              $crate::saturating_u8::SaturatingU8,
            >($public_run))(game, my_id)
            .await;
            game
              .game
              .modify_card(my_id, |mut c| {
                c.add_xcost_modifier(my_id, Modifier::SetCost(cost))
              })
              .await;
          }
        })
      },
      |game, secret, _, log, my_id, phase| {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let cost: $crate::saturating_u8::SaturatingU8 =
            ($crate::utils::secret_xcost_helper::<_, $crate::saturating_u8::SaturatingU8>(
              $secret_run,
            ))(game, secret, my_id);
          secret
            .modify_card(my_id, log, |mut c| {
              c.add_xcost_modifier(my_id, Modifier::SetCost(cost))
            })
            .expect("Modify can't fail because my_id is always in secret.");
        }
      },
      AuraLayer::SetCost
    )
  };
}

#[macro_export]
/// All your mana requires at least 1 mana for the card to be playable
macro_rules! xcost_all_your_mana {
  () => {
    xcost_set!(
      |game, my_id| Box::pin(async move { game.player(game.owner(my_id)).mana }),
      |game, secret, _| { game.player(secret.player()).mana }
    )
  };
}

#[macro_export]
macro_rules! xcost_modify {
  // Only a public `run`, this card only reads from public state
  ($public_run:expr, $layer:expr) => {
    xcost_internal!(
      |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let cost: i8 = ($crate::utils::public_xcost_helper::<_, i8>($public_run))(game, my_id);
            game
              .game
              .modify_card(my_id, |mut c| {
                c.add_xcost_modifier(my_id, Modifier::ModifyCost(cost))
              })
              .await;
          }
        })
      },
      |game, secret, _, log, my_id, phase| {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let cost: i8 = ($crate::utils::public_xcost_helper::<_, i8>($public_run))(game, my_id);
          secret
            .modify_card(my_id, log, |mut c| {
              c.add_xcost_modifier(my_id, Modifier::ModifyCost(cost))
            })
            .expect("Modify can't fail because my_id is always in secret.");
        }
      },
      $layer
    )
  };
  // Both a public & private run, this card reads from secret state.
  ($public_run:expr, $secret_run:expr, $layer:expr) => {
    xcost_internal!(
      |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let cost: i8 = ($crate::utils::xcost_helper::<_, i8>($public_run))(game, my_id).await;
            game
              .game
              .modify_card(my_id, |mut c| {
                c.add_xcost_modifier(my_id, Modifier::ModifyCost(cost))
              })
              .await;
          }
        })
      },
      |game, secret, _, log, my_id, phase| {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let cost: i8 =
            ($crate::utils::secret_xcost_helper::<_, i8>($secret_run))(game, secret, my_id);
          secret
            .modify_card(my_id, log, |mut c| {
              c.add_xcost_modifier(my_id, Modifier::ModifyCost(cost))
            })
            .expect("Modify can't fail because my_id is always in secret.");
        }
      },
      $layer
    )
  };
}

/// e.g. Inspire: Water Unit - dust played card
/// inspire!(game, phase, my_id, |_, card: CardInfo<SkyWeaver>| card.is_unit() && card.element == Element::Water, async move |_| {
///   game.dust(id).await;
/// })
#[macro_export]
macro_rules! inspire {
  ($predicate:expr, $run:expr) => {
    EarlyTrigger {
      effect_type: EffectType::Inspire,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseResolveCardEffect {
            base_card,
            id,
            target_id,
            played_mana_cost,
            played_by_unit,
          }) = phase.try_into()
          {
            if played_by_unit {
              return;
            }
            // Inspire requires this unit's owner is the same as the owner of the card being played
            // And the unit is on the field
            // and it's not dead.
            let this_unit_owner = game.owner(my_id);
            if game.owner(id) == this_unit_owner
              && game.is_alive_on_field(my_id)
              && game
                .reveal_from_card(id, move |c| {
                  #[allow(clippy::redundant_closure_call)]
                  ($predicate)(played_mana_cost, c)
                })
                .await
            {
              game.queue.push(PhaseResolveTrigger {
                id: my_id,
                effect: CardEffect::Intrinsic(base_card),
                effect_type: EffectType::Generic,
                fire: Box::new(move |game: &mut LiveGame| {
                  Box::pin(async move {
                    for _ in 0..game.player(this_unit_owner).inspire_repeat {
                      if game.is_alive_on_field(my_id) {
                        $crate::utils::future_helper_1::<
                          InstanceID,
                          ResolvedPhaseResolveCardEffect,
                          _,
                        >($run)(
                          game,
                          my_id,
                          ResolvedPhaseResolveCardEffect {
                            base_card,
                            id,
                            target_id,
                            played_mana_cost,
                            played_by_unit,
                          },
                        )
                        .await;
                      }
                    }
                  })
                }),
              });
            }
          }
        })
      },
    }
  };
}

/// Auras should only modify cards, not run any phases.
#[macro_export]
macro_rules! unit_aura {
  ($run:expr, $layer:expr) => {
    unit_aura!($run, $layer, false)
  };
  ($run:expr, $layer:expr, $dfa:expr) => {
    EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order($dfa, $layer),
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            $crate::utils::future_helper_0($run)(game, my_id).await;
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! unit_death {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Death,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |_, queue, my_id, phase, _| {
        Box::pin(async move {
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
            if dead_card.id() == Some(my_id) {
              queue.add_resolution(move |game| {
                $crate::utils::future_helper_1::<InstanceID, InstanceID, _>($run)(
                  game, my_id, my_id,
                )
              });
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! unit_slay {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Slay,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseDamage {
            target,
            amount: _,
            overkill: _,
            source,
            is_wither: _,
            lifesteal_from: _,
            kind: _,
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);
            if game.current_player == owner
              && source == my_id
              && game
                .reveal_from_card(target, |c| c.marked_for_death.is_some())
                .await
            {
              queue.add_resolution(move |game| {
                $crate::utils::future_helper_1::<InstanceID, InstanceID, _>($run)(
                  game, my_id, target,
                )
              });
            }
          }
        })
      },
    }
  };
}
#[macro_export]
macro_rules! spell_slay {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Slay,
      priority: 0,
      is_active: |_, _| true,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseDamage {
            target,
            amount: _,
            overkill: _,
            source,
            is_wither: _,
            lifesteal_from: _,
            kind: _,
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);
            if game.current_player == owner
              && source == my_id
              && game
                .reveal_from_card(target, |c| c.marked_for_death.is_some())
                .await
            {
              queue.add_resolution(move |game| $crate::utils::future_helper_0($run)(game, my_id));
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! unit_summon {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Summon,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |_, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseMoveToZone {
            card,
            to: (_, Zone::Field),
            from,
          }) = phase.try_into()
          {
            if !from.is_field() && card.id() == Some(my_id) {
              queue.add_resolution(move |game| $crate::utils::future_helper_0($run)(game, my_id))
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! unit_glory {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Glory,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(glory) = phase.try_into() {
            let ResolvedPhaseGlory(attacker_id, damage) = glory;
            if attacker_id == my_id {
              let this_unit_owner = game.owner(my_id);
              for _ in 0..game.player(this_unit_owner).glory_repeat {
                queue.add_resolution(move |game| {
                  $crate::utils::future_helper_1::<InstanceID, $crate::saturating_u8::SaturatingU8, _>(
                    $run,
                  )(game, my_id, damage)
                })
              }
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! sunrise {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Sunrise,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseStartTurn { player, .. }) = phase.try_into() {
            if player == game.owner(my_id) {
              queue.add_resolution(move |game| {
                $crate::utils::future_helper_1::<InstanceID, Player, _>($run)(game, my_id, player)
              })
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! sunset {
  ($run:expr) => {
    NormalTrigger {
      effect_type: EffectType::Sunset,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
            if player == game.owner(my_id) {
              queue.add_resolution(move |game| {
                $crate::utils::future_helper_1::<InstanceID, Player, _>($run)(game, my_id, player)
              })
            }
          }
        })
      },
    }
  };
}

#[macro_export]
macro_rules! sigil {
  ($ally_spell:expr, $enemy_spell:expr) => {
    lazy_static! {
      pub static ref EFFECT: Effect = Effect::Spell {
        triggers: vec![],
        on_play: OnPlayEffect::Targeted {
          does_target: targets::any_unit,
          mutate: |game, _, target, owner| {
            Box::pin(async move {
              game
                .give_spell(
                  target,
                  if game.owner(target) == owner {
                    $ally_spell
                  } else {
                    $enemy_spell
                  },
                )
                .await;
            })
          },
        }
      };
    }
  };
}

#[macro_export]
macro_rules! when_enchant_is_removed_in_play {
  ($run:expr) => {
    Effect::Unit {
      on_play: None,
      triggers: vec![EarlyTrigger {
        effect_type: EffectType::Generic, // basically exhibits as an on-play, we don't have a special trigger icon for this.
        priority: 0,
        is_active: |zone, _card| zone.is_field(), // ignore _card because it runs when silenced
        run: |game, unit_id, phase, _| {
          Box::pin(async move {
            let attach_id = unit_id.instance(game, None).unwrap().attachment();
            let should_fire = match phase {
              Phase::MoveToZone(PhaseMoveToZone {
                card,
                ..
              }) if card.id() == attach_id => true,
              _ => false,
            };
            if should_fire {
                game.run_instant_trigger(*attach_id.unwrap().instance(game, None).unwrap().base(), attach_id.unwrap(), EffectType::Generic,move |game| Box::pin(async move {
                $crate::utils::future_helper_0($run)(game, unit_id).await;
  })).await;

            }
          })
        },
      }
      .into()],
    }
  };
}

#[macro_export]
macro_rules! intrinsic_effect {
  ($eff:expr) => {
    lazy_static! {
      pub static ref EFFECT: Effect = $eff;
    }
  };
}

/**
This macro is magic.
```rs
 attachable_effect!(Frostbite(u8), FROSTBITE, Effect::Unit {..});
```
will make available a CardEffect::Frostbite(u8) through the magic of `build.rs`.
*/
#[macro_export]
macro_rules! attachable_effect {
  ($enumstruct:item, $name:ident, $eff:expr) => {
    lazy_static! {
      pub static ref $name: Effect = $eff;
    }
  };
}

#[macro_export]
macro_rules! effect_while_attached {
  ($effect:expr) => {
    Effect::Enchant {
      on_attach: |parent, enchant| {
        parent.add_modifier(
          enchant.id(),
          0,
          Modifier::GrantEffect($effect),
          ModifierExpiry::Never { copyable: false },
        );
      },
      on_detach: |parent, enchant| {
        parent.remove_modifier(|m| {
          m.source == enchant.id()
            && if let Modifier::GrantEffect(eff) = m.modifier {
              eff == $effect
            } else {
              false
            }
        });
      },
    }
  };
}

/**
This macro is magic.
```rs
 attack_restriction!(
   HeroNotHitStealth,
    |defender: &CardInstance<SkyWeaver>, defender_field: &[InstanceID]| {
     !defender.traits.contains(&Trait::Stealth)
  }
 );
```
will make available AttackRestriction::HeroNotHitStealth through the magic of `build.rs`.
*/
#[macro_export]
macro_rules! attack_restriction {
  ($enumname:ident, $filter_closure:expr) => {};
}

/**
This macro is magic.
```rs
 let filter = serializable_filter!(SerializableFilter::IsUnitFilter, |c: &CardInfo<SkyWeaver>| c.is_unit());
```
*/
#[macro_export]
macro_rules! serializable_filter {
  ($unique_ident:path, $filter_fn:expr) => {};
}
