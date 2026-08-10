use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseChangeMaxMana { player, delta }) = phase.try_into() {
          let owner = game.owner(my_id);
          if player != owner || delta <= 0 {
            return;
          }
          for _ in 0..delta {
            game
              .run_instant_trigger(BaseCard::C2147, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game
                    .modify_card_single(my_id, Modifier::ModifyPower(1, None))
                    .await;
                })
              })
              .await;
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
