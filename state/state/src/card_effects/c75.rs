use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game.draw(owner, |c, _| is_blade(&c.base)).await;
  }))
  .into()],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          game.draw(owner, |c, _| is_blade(&c.base)).await;
        })
      },
    }
  ))
});
