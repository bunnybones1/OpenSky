use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero_id = game.hero_id(owner);
    game.give_spell(hero_id, enchant::VAPORS).await;
  }))
  .into()],
  on_play: None
});
