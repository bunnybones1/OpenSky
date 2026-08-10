use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let played_spell = game
      .player(owner)
      .this_turn_stats
      .base_cards_played
      .iter()
      .any(|c| c.instance().is_spell());
    if played_spell {
      for _ in 0..6 {
        let random_enemies = game.enemy_field(owner);
        game.smart_random_damage(random_enemies, 1, my_id).await;
      }
    }
  }))
  .into()],
  on_play: None
});
