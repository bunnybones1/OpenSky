use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    for player in [owner, enemy_player].iter() {
      game
        .draw(*player, move |c, _| c.is_spell() && c.cost >= 5)
        .await;
    }
  }))
  .into()],
  on_play: None
});
