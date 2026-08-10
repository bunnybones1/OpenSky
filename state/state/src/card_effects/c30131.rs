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
              let c = game.create_card(owner, BaseCard::C1).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
            }
            if card_indices.contains(&1) {
              let c = game.create_card(owner, BaseCard::C2).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
            }
            if card_indices.contains(&2) {
              let c = game.create_card(owner, BaseCard::C3).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
            }
            if card_indices.contains(&3) {
              let c = game.create_card(owner, BaseCard::C4).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
            }
            if card_indices.contains(&4) {
              let c = game.create_card(owner, BaseCard::C5).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
            }
            if card_indices.contains(&5) {
              let c = game.create_card(owner, BaseCard::C6).await;
              game.move_to_zone(c, Zone::Hand { public: false }).await;
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
      let c1 = game.create_card(owner, BaseCard::C1).await;
      let c2 = game.create_card(owner, BaseCard::C2).await;
      let c3 = game.create_card(owner, BaseCard::C3).await;
      let c4 = game.create_card(owner, BaseCard::C4).await;
      let c5 = game.create_card(owner, BaseCard::C5).await;
      let c6 = game.create_card(owner, BaseCard::C6).await;

      game
        .begin_choose(0, 3, None, vec![c1, c2, c3, c4, c5, c6])
        .await;
    })
  }
});
