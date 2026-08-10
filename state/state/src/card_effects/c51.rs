use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);

    if game.player_cards(owner).hand().len() & 1 != 0 {
      game.draw_any_card(owner).await;
    }
  }))
  .into()],
  on_play: None
});
