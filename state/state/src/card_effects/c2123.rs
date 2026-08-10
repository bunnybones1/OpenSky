use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseDamage {
          target,
          amount,
          source,
          ..
        }) = phase.try_into()
        {
          if target == my_id
            && amount > 0
            && game.owner(source) != game.owner(my_id)
            && game
              .reveal_from_card(source, |c| c.is_spell() || c.is_unit() || c.is_hero())
              .await
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let owner = game.owner(my_id);
                for _ in 0..2 {
                  let blight = game.create_card(enemy(owner), BaseCard::C20064).await;
                  game.move_to_zone(blight, Zone::Deck).await;
                }
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
