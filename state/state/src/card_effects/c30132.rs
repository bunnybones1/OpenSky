use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
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
              game.instantiate_and_summon(owner, BaseCard::C20000).await;
            }
            if card_indices.contains(&1) {
              game.instantiate_and_summon(owner, BaseCard::C20013).await;
            }
            if card_indices.contains(&2) {
              game.instantiate_and_summon(owner, BaseCard::C20001).await;
            }
            game.context().mutate_secret(player, |secret| {
              secret.secret.card_selection_state = None;
            });
            game.move_to_zone(my_id, Zone::Graveyard).await;
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| Box::pin(async move {
      let c1 = game.create_card(owner, BaseCard::C20000).await;
      let c2 = game.create_card(owner, BaseCard::C20013).await;
      let c3 = game.create_card(owner, BaseCard::C20001).await;
      game.begin_choose(2, 2, None, vec![c1, c2, c3]).await;
    })
  }
});
