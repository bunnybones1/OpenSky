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
          let target = game
            .context()
            .reveal_unique(
              player,
              |secret| {
                secret
                  .card_selection_state
                  .as_ref()
                  .unwrap()
                  .target
                  .unwrap()
              },
              |_| true,
            )
            .await;
          let owner = game.owner(my_id);
          if !is_init_card_selection && player == owner {
            if card_indices.contains(&0) {
              game.damage(target, 2, my_id).await;
            }
            if card_indices.contains(&1) {
              game.damage(target, 3, my_id).await;
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
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        let c1 = game.create_card(owner, BaseCard::C30136).await;
        let c2 = game.create_card(owner, BaseCard::C30137).await;
        game.begin_choose(1, 1, Some(target), vec![c1, c2]).await;
      })
    }
  }
});
