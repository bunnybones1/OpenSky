use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Earth,
    |game, my_id, _phase| {
      Box::pin(async move {
        game
          .modify_card(
            my_id,
            vec![
              Modifier::ModifyPower(1, None),
              Modifier::ModifyHealth(1, None),
            ],
          )
          .await;
      })
    }
  )
  .into()],
  on_play: None
});
