use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let drones_amount = if game.hero(owner).health <= 16 { 3 } else { 2 };
        game.cleanup_dead_units().await;
        for _ in 0..drones_amount {
          game.instantiate_and_summon(owner, BaseCard::C20058).await;
        }
      })
    },
  }
});
