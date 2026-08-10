use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);

    game
      .grant_modifier_for_turns(hero, my_id, Modifier::ModifyPower(1, None), 0, 1)
      .await;
  }))
  .into()],
  on_play: None
});
