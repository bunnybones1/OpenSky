use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      game.berf(my_id, 2, -2).await;
    })
  )
  .into()],
  on_play: None
});
