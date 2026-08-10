use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Sunrise,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |_, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseStartTurn { .. }) = phase.try_into() {
          queue.add_resolution(move |game| {
            Box::pin(async move {
              let owner = game.owner(my_id);
              let hero_id = game.hero_id(owner);
              if game.turn_count == 1 {
                game
                  .modify_card_single(hero_id, Modifier::ModifyHealth(4, None))
                  .await;
              }
            })
          })
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
