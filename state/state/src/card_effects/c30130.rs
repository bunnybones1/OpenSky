use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Choose,
    priority: 0,
    is_active: is_in_casting,
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
            if card_indices.contains(&0) {
              game
                .modify_card_single(my_id, Modifier::GrantTrait(Trait::Banner))
                .await;
            }
            if card_indices.contains(&1) {
              game
                .modify_card_single(my_id, Modifier::GrantTrait(Trait::Dash))
                .await;
            }
            game.context().mutate_secret(player, |secret| {
              secret.secret.card_selection_state = None;
            });
            game.summon(my_id).await;
          }
        }
      })
    },
  }
  .into()],
  on_play: Some((
    SummonTiming::Manual,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| Box::pin(async move {
        let dash_copy = game.create_card(owner, BaseCard::C30130).await;
        game
          .modify_card_single(dash_copy, Modifier::GrantTrait(Trait::Dash))
          .await;
        let banner_copy = game.create_card(owner, BaseCard::C30130).await;
        game
          .modify_card_single(banner_copy, Modifier::GrantTrait(Trait::Banner))
          .await;

        game
          .begin_choose(1, 1, None, vec![dash_copy, banner_copy])
          .await;
      })
    }
  ))
});
