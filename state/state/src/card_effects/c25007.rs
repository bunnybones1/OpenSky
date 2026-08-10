use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
          if player == game.owner(my_id) {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                if game.player(player).mana >= 1 {
                  game.change_mana_next_turn(player, 1, my_id).await;
                }
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
