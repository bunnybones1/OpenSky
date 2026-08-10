use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let all_units = game.all_units();
    let damage = 4;

    game.damage_many(&all_units, damage, my_id).await;

    let all_units: Vec<_> = all_units.into_iter().map_into().collect();
    game.give_spell_many(&all_units, enchant::FLAMES).await;
  }))
  .into()],
  on_play: None
});
