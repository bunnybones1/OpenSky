use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let is_on_field = game
      .location(my_id)
      .location
      .map_or(false, |l| l.0.eq(Zone::Field).unwrap_or(false));

    let hand_size = game.player_cards(owner).hand().len() as u16;
    if is_on_field && hand_size < game.game_params.max_hand_size {
      game.bounce(my_id).await;
      game.give_spell(my_id, BaseCard::C20048).await;
    }
  }))
  .into()],
  on_play: None
});
