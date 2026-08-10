use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Sunrise,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
          let owner = game.owner(my_id);
          if player == owner {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game
                  .modify_card(my_id, vec![Modifier::GrantTrait(Trait::Guard)])
                  .await;
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
