use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let drawn = game
      .draw(owner, |c, _| c.is_unit() && c.element == Element::Metal)
      .await;
    if let Some(drawn) = drawn {
      game.berf(drawn, 1, 1).await;
    }
  }))
  .into()],
  on_play: None
});
