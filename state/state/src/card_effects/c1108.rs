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
      if let Ok(ResolvedPhaseDamage { target, amount, .. }) = phase.try_into() {
        if target == game.hero_id(owner) && amount > 0 {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              game.damage(game.hero_id(enemy(owner)), 1, my_id).await;
              game
                .modify_card(
                  my_id,
                  vec![
                    Modifier::ModifyPower(1, None),
                    Modifier::ModifyHealth(1, None),
                  ],
                )
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
