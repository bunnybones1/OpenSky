use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let enemies = game.units::<InstanceID>(enemy(owner));
        for enemy in enemies {
          game.steal_power(enemy, my_id, 1).await;
        }
      })
    }
  ))
});
