use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemies = game.characters::<InstanceID>(enemy(owner));
    for enemy in enemies {
      game.steal_health(enemy, my_id, 1).await;
    }
  }))
  .into()],
  on_play: None
});
