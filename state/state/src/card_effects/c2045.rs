use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _| Box::pin(async move {
      let owner = game.owner(my_id);
      let hero = game.hero_id(owner);
      game.heal(hero, 1).await;
    })
  )
  .into()],
  on_play: None
});
