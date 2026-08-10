use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Water,
    |game, my_id, phase| {
      Box::pin(async move {
        if phase.played_mana_cost >= 1 {
          game
            .modify_card(
              my_id,
              vec![
                Modifier::ModifyPower(1, None),
                Modifier::ModifyHealth(1, None),
              ],
            )
            .await;
        }
      })
    }
  )
  .into()],
  on_play: None
});
