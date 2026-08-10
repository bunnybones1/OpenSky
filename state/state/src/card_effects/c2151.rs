use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    game
      .modify_card_single(hero, Modifier::ModifyHealth(2, None))
      .await;
  }))
  .into()],
  on_play: None
});
