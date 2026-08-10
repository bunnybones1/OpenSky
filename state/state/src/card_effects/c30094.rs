use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    // Both draw
    game.draw_any_card(owner).await;
    game.draw_any_card(enemy_player).await;
  }))
  .into()],
  on_play: None
});
