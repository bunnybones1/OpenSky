use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseResolveCardEffect {
          id, played_by_unit, ..
        }) = phase.try_into()
        {
          if played_by_unit {
            return;
          }
          let card_owner = game.owner(id);
          let card_type = game.reveal_from_card(id, |c| c.r#type).await;
          if card_type == Type::Spell && card_owner != game.owner(my_id) {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                let enemy_hero = game.hero_id(card_owner);
                let damage = 2;
                game.damage(enemy_hero, damage, my_id).await;
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
