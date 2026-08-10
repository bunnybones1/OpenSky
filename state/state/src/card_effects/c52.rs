use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from,
          to: (field_owner, Zone::Field),
          ..
        }) = phase.try_into()
        {
          if !from.is_field() && field_owner == owner && card.id() != Some(my_id) {
            game
              .run_instant_trigger(BaseCard::C52, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game.change_power(card, 1).await;
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
