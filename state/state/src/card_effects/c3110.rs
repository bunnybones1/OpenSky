use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_hero,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let hero_owner = game.owner(target);
            let top_two_dead_cards = game
              .graveyard::<&CardInstance<SkyWeaver>>(hero_owner)
              .into_iter()
              .filter(|c| c.is_unit())
              .rev() // reverse, so 0 index in enumerate is bottom & max is top
              .enumerate()
              // sort by highest cost, then index,
              // so that we get the top highest cost card.
              .sorted_by_key(|(i, c)| (c.cost, *i))
              .rev()
              .take(2)
              .map(|(_, c)| c.id())
              .collect_vec();

            if top_two_dead_cards.len() != 2 {
              return;
            }
            for card in &top_two_dead_cards {
              if !game.dust(*card).await {
                return;
              }
            }

            let first_stuff = game
              .reveal_from_card(top_two_dead_cards[0], |c| {
                (c.power, c.health, c.traits.clone())
              })
              .await;
            let second_stuff = game
              .reveal_from_card(top_two_dead_cards[1], |c| {
                (c.power, c.health, c.traits.clone())
              })
              .await;

            let mut traits: Vec<_> = first_stuff.2.union(&second_stuff.2).copied().collect();

            if traits.contains(&Trait::Guard) {
              traits.retain(|t| t != &Trait::Stealth);
            }

            let modifiers = many![
              Modifier::ModifyPower((first_stuff.0 + second_stuff.0).into(), None),
              Modifier::ModifyHealth((first_stuff.1 + second_stuff.1).into(), None)
            ]
            .chain(traits.into_iter().map(Modifier::GrantTrait))
            .collect();
            game.modify_card(my_id, modifiers).await;
          }
        })
      },
    }
  ))
});
