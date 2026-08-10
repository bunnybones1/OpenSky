use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Mind,
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let random_enemy_units = game.enemy_units(owner);
      game
        .smart_random_attach(enchant::DAZED, random_enemy_units)
        .await;
    })
  )
  .into()],
  on_play: None
});
