use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, Zone::Field),
          from,
        }) = phase.try_into()
        {
          if !from.is_field() && unit_owner == owner && card.id() != Some(my_id) {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game
                  .modify_card_single(card, Modifier::GrantTrait(Trait::Dash))
                  .await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
