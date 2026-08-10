use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player_cards(owner).deck() == 0 {
      let (pow, hp) = game.reveal_from_card(my_id, |c| (c.power, c.health)).await;
      game.berf(my_id, pow.into(), hp.into()).await;
    }
  }))
  .into()],
  on_play: None
});
