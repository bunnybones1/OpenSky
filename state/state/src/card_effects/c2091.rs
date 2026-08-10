use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemies = game.characters(enemy(owner));
    game.damage_many(&enemies, 1, my_id).await;
  }))
  .into()],
  on_play: None
});
