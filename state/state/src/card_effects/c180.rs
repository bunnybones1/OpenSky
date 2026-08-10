use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          let grave_blades = game
            .graveyard::<InstanceID>(owner)
            .into_iter()
            .filter(|c| is_blade(c.instance(game, None).unwrap().base()))
            .collect_vec();
          game
            .move_to_zone_many(grave_blades.iter().map_into().collect(), Zone::Casting)
            .await;
          for card in grave_blades.into_iter().rev().collect::<Vec<InstanceID>>() {
            let owner = game.owner(card);
            let card_instance = card.instance(game, None).unwrap();
            let card_base = card_instance.base();
            let is_x_cost = card_instance.is_x_cost;
            let cost = if is_x_cost {
              0
            } else {
              i8::from(card_instance.cost)
            };
            match card_base.intrinsic_effect().on_play() {
              OnPlayEffect::Targeted { does_target, .. } => {
                let game_clone: card_movement_simulator::GameState<SkyWeaver> =
                  Clone::clone(&***game);
                let any_potential_targets = game
                  .context()
                  .reveal_unique(
                    owner,
                    move |secret| {
                      game_clone
                        .all_units::<&CardInstance<SkyWeaver>>()
                        .into_iter()
                        .filter_map(|target| {
                          let can_be_targeted = if game_clone.owner(target.id()) == owner {
                            target.can_be_targeted_by_owner
                          } else {
                            target.can_be_targeted_by_enemy
                          };

                          (can_be_targeted
                            && does_target(&game_clone, secret, owner, card, target.id()))
                          .then_some(target.id())
                        })
                        .collect_vec()
                    },
                    |_| true,
                  )
                  .await;
                let any_potential_targets = any_potential_targets
                  .iter()
                  .filter(|c| {
                    let contains_ally_units = any_potential_targets
                      .iter()
                      .find(|c| game.owner(**c) == owner);
                    if contains_ally_units.is_some() {
                      game.owner(**c) == owner
                    } else {
                      false
                    }
                  })
                  .collect_vec();

                match any_potential_targets.len().cmp(&1) {
                  std::cmp::Ordering::Equal => {
                    game
                      .resolve_card_effect_as_unit(
                        card,
                        Some(*any_potential_targets[0]),
                        cost.into(),
                      )
                      .await;
                  }
                  std::cmp::Ordering::Greater => {
                    let mut rng = game.context.random().await;

                    let target = any_potential_targets.choose(&mut rng).unwrap();
                    game
                      .resolve_card_effect_as_unit(card, Some(**target), cost.into())
                      .await;
                  }
                  std::cmp::Ordering::Less => {}
                }
                if game.reveal_from_card(card, |c| c.zone.is_casting()).await {
                  game.move_to_zone(card, Zone::Graveyard).await;
                }
              }
              OnPlayEffect::Untargeted { .. } => {
                game
                  .resolve_card_effect_as_unit(card, None, cost.into())
                  .await;
                if game.reveal_from_card(card, |c| c.zone.is_casting()).await {
                  game.move_to_zone(card, Zone::Graveyard).await;
                }
              }
              _ => {}
            }
          }
        })
      },
    }
  ))
});
