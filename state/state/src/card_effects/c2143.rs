use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          game.draw(owner, move |c, _| is_scion(&c.base)).await;
        })
      },
    }
  ))
});
