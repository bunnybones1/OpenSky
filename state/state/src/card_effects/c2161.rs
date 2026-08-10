use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let health_gain = game.player(owner).max_mana;
        game.change_health(my_id, health_gain.into()).await;
      })
    }
  ))
});
