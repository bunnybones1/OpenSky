use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _| Box::pin(async move {
      let owner = game.owner(my_id);
      game.reveal_random_hand_card(enemy(owner)).await;
    })
  )
  .into()],
  on_play: None
});
