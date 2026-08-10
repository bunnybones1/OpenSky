use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);

    game
      .modify_card(hero, vec![Modifier::GrantTrait(Trait::Armor)])
      .await;
  }))
  .into()],
  on_play: None
});
