use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if game.current_player != owner {
        return;
      }
      if let Ok(ResolvedPhaseAttack { attacker, .. }) = phase.try_into() {
        let hero = game.hero_id(owner);
        if attacker == hero {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              game
                .modify_card_single(hero, Modifier::ModifyHealth(1, None))
                .await;
            })
          })
        }
      }
    }),
  }
  .into()],
  on_play: None
});
