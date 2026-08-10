use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |_, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseDamage { target, amount, .. }) = phase.try_into() {
          if target == my_id && amount > 0 {
            queue.add_resolution(|game| {
              Box::pin(async move {
                for player in 0..2 {
                  if !game.hand_is_full(player) {
                    game.add_to_hand(player, BaseCard::C20060).await;
                  }
                }
              })
            });
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});
