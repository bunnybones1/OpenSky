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
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let owner = game.owner(my_id);
                game.instantiate_and_summon(owner, BaseCard::C20013).await;
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
