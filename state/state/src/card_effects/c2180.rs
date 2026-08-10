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
          let unit_hp = game.reveal_from_card(card, |c| c.health).await;
          let my_hp = game.reveal_from_card(my_id, |c| c.health).await;
          let delta = my_hp - unit_hp;
          if from.is_casting() && unit_owner == owner && card.id() != Some(my_id) && delta > 0 {
            game
              .run_instant_trigger(BaseCard::C2180, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game
                    .modify_card_single(card, Modifier::ModifyHealth(delta.into(), None))
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
