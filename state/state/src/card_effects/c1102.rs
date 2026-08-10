use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_units = game.enemy_field(owner);

    game.give_spell_many(&enemy_units, enchant::CHAINS).await;
  }))
  .into()],
  on_play: None
});
