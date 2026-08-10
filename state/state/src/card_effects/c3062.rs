use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let ally_units: Vec<Card> = game.units(owner);
    game.give_spell_many(&ally_units, enchant::FATE).await;
  }))
  .into()],
  on_play: None
});
