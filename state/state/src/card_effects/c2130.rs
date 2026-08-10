use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseDamage { target, amount, .. }) = phase.try_into() {
          if game.owner(target) == owner && game.reveal_from_card(target, |c| c.is_unit()).await {
            game
              .run_instant_trigger(BaseCard::C2130, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game
                    .modify_card_single(target, Modifier::ModifyPower(amount.into(), None))
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
