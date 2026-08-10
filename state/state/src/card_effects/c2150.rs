use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, _owner| Box::pin(async move {
        for p in 0..=1 {
          game.change_max_mana(p, 1).await;
        }
      })
    }
  ))
});
