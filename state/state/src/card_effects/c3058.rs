use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    game.draw(owner, |c, _| c.element == Element::Dark).await;
    game.draw(owner, |c, _| c.element == Element::Light).await;
  }))
  .into()],
  on_play: None
});
