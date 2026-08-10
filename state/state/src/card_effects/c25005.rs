use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Sunset,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
          if player == game.owner(my_id) {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
                game.damage(enemy_hero, 1, my_id).await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
