use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Choose,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseResolveCardSelection {
          card_indices,
          player,
          is_init_card_selection,
        }) = phase.try_into()
        {
          let owner = game.owner(my_id);
          if !is_init_card_selection && player == owner {
            let choice_index = card_indices[0]; // we expect exactly 1 choice here
            let choice_card = game.card_selection_card(player, choice_index);
            let choice_card_instance = game
              .reveal_from_card(choice_card, |c| c.instance.id())
              .await;
            let not_selected_choices = game
              .card_selection_cards(player)
              .into_iter()
              .enumerate()
              .filter(|(i, _)| !card_indices.contains(&i))
              .map(|(_, c)| c)
              .collect::<Vec<_>>();

            for card in not_selected_choices {
              game.dust(card).await;
            }

            game.move_to_zone(choice_card, Zone::Casting).await;
            game
              .resolve_card_effect_as_player(choice_card_instance, None, 0.into())
              .await;
            game
              .move_to_zone(choice_card, Zone::Dust { public: false })
              .await;

            game.context().mutate_secret(player, |secret| {
              secret.secret.card_selection_state = None;
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| Box::pin(async move {
      let fates_boon = game.create_card(owner, BaseCard::C25024).await;
      let fates_bane = game.create_card(owner, BaseCard::C25025).await;
      game
        .begin_choose(1, 1, None, vec![fates_boon.into(), fates_bane])
        .await;
    })
  }
});
