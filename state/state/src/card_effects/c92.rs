use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, Zone::Field),
          from,
        }) = phase.try_into()
        {
          let has_guard = game
            .reveal_from_card(card, |c| c.traits.contains(&Trait::Guard))
            .await;
          if !from.is_field() && unit_owner == owner && card.id() != Some(my_id) && has_guard {
            game.berf(card, 1, 1).await;
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
