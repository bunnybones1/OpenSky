use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Metal,
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let hero = game.hero_id(owner);
      game.give_spell(hero, BaseCard::C20022).await;
    })
  )
  .into()],
  on_play: None
});
