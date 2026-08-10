use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);

    for element in Element::iter() {
      let id = game
        .random_hand_card_matching(owner, move |c, _| c.is_unit() && c.element == element)
        .await;
      if let Some(id) = id {
        game.berf(id, 1, 1).await;
      }
    }
  }))
  .into()],
  on_play: None
});
