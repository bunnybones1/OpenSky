use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let leftmost_unit_in_enemy_hand = game
      .leftmost_hand_card_matching(enemy(owner), |c, _| c.is_unit())
      .await;
    if let Some(leftmost_unit_in_enemy_hand) = leftmost_unit_in_enemy_hand {
      game.summon(leftmost_unit_in_enemy_hand).await;
    }
  }))
  .into()],
  on_play: None
});
