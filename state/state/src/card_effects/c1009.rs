use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    for _ in 0..3u8 {
      game.draw_into_play(owner, |card, _| card.cost == 1).await;
    }
  }))
  .into()],
  on_play: None
});
