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
          let owner = game.owner(my_id);

          if game
            .reveal_from_card(card, move |c| c.zone.is_field() && c.owner == owner)
            .await
            && amount > 0
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                game
                  .modify_card_single(card, Modifier::ModifyHealth(1, None))
                  .await;
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
