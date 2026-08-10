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
      let damage = 1;
      let owner = game.owner(my_id);

      let enemy = game
        .lowest_health_character(enemy(owner), |c| c.is_unit())
        .await;
      if let Some(enemy) = enemy {
        game.give_spell(enemy, enchant::FROSTBITE).await;
        game.damage(enemy, damage, my_id).await;
      }
    }
  }))
  .into()],
  on_play: None
});
