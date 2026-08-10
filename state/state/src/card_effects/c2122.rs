use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, target| Box::pin(async move {
    let owner = game.owner(my_id);
    let element = target.instance(game, None).unwrap().element;
    game.draw(owner, move |c, _| c.element == element).await;
  }))
  .into()],
  on_play: None
});
