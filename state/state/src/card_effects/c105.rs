use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.cost > 0,
    |game, my_id, phase| {
      Box::pin(async move {
        if phase.played_mana_cost >= 1 {
          let owner = game.owner(my_id);
          let element = phase.base_card.instance().element;
          game
            .give_hand_cards(
              owner,
              move |c| c.element == element && c.is_unit(),
              vec![
                Modifier::ModifyPower(1, None),
                Modifier::ModifyHealth(1, None),
              ],
              my_id,
            )
            .await;
        }
      })
    }
  )
  .into()],
  on_play: None
});
