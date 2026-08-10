use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    game
      .give_hand_cards(
        game.owner(my_id),
        |c| c.element == Element::Water,
        vec![Modifier::ModifyCost(-1)],
        my_id,
      )
      .await;
  }))
  .into()],
  on_play: None
});
