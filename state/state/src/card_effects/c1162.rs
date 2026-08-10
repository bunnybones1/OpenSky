use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if let Ok(ResolvedPhaseAttack {
        attacker, defender, ..
      }) = phase.try_into()
      {
        if attacker == game.hero_id(owner)
          && game.owner(defender) != owner
          && game.reveal_from_card(defender, |c| c.is_unit()).await
        {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              if game
                .reveal_from_card(defender, |c| c.marked_for_death.is_none())
                .await
              {
                game.fight(my_id, defender).await;
              }
            })
          })
        }
      }
    }),
  }
  .into()],
  on_play: None
});
