use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Slay,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseAttack {
          attacker, defender, ..
        }) = phase.try_into()
        {
          if attacker == my_id
            && game
              .reveal_from_card(defender, |c| c.marked_for_death.is_some())
              .await
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let hero_id = game.hero_id(game.owner(my_id));
                game.give_spell(hero_id, BaseCard::C1112).await;
              })
            });
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});
