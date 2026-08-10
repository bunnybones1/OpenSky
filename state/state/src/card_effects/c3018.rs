use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Light,
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let hero = game.hero_id(owner);
      game.change_health(hero, 1).await;
      game.give_spell(hero, enchant::SHIELD).await;
    })
  )
  .into()],
  on_play: None
});
