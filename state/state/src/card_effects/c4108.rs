use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      game.instantiate_and_summon(owner, BaseCard::C20058).await;
    })
  )
  .into()],
  on_play: None
});
