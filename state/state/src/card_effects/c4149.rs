use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      game
        .modify_card_single(my_id, Modifier::ModifyHealth(1, None))
        .await;
    })
  )
  .into()],
  on_play: None
});
