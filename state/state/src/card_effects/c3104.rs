use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Dark,
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);

      game.instantiate_and_summon(owner, BaseCard::C3104).await;
    })
  )
  .into()],
  on_play: None
});
