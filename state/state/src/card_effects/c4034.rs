use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_units = game.enemy_units(owner);
    game.give_spell_many(&enemy_units, enchant::ROOTS).await;
  }))
  .into()],
  on_play: None
});
