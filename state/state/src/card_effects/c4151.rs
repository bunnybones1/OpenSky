use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let played_spell = game
      .player(owner)
      .this_turn_stats
      .base_cards_played
      .iter()
      .find(|c| c.instance().is_spell());
    if played_spell.is_some() {
      game.berf(my_id, 2, 2).await;
    }
  }))
  .into()],
  on_play: None
});
