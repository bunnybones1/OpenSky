use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseModifyCard {
          card,
          modifier: Modifier::ModifyPower(amount, _),
          ..
        }) = phase.try_into()
        {
          if game
            .reveal_from_card(card, move |c| c.zone.is_field() && c.id() == my_id)
            .await
            && amount > 0
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let owner = game.owner(my_id);
                game.draw_any_card(owner).await;
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
