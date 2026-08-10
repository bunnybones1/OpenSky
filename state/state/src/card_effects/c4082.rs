use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseDamage { target, amount, .. }) = phase.try_into() {
          let owner = game.owner(my_id);
          if target == my_id && amount > 0 {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let card = game.create_card(owner, BaseCard::C2006).await;
                game.move_to_zone(card, Zone::Casting).await;
                game.cast_spell_on_enemies(card, |_| true, true, true).await;
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
