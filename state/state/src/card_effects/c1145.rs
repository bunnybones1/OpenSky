use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseDamage { source, kind, .. }) = phase.try_into() {
          if source != my_id {
            return;
          }

          if let DamageKind::Combat {
            is_retaliation: false,
          } = kind
          {
            game
              .run_instant_trigger(BaseCard::C1107, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  let hero = game.hero_id(owner);
                  game
                    .grant_modifier_for_turns(hero, my_id, Modifier::ModifyPower(2, None), 0, 1)
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
