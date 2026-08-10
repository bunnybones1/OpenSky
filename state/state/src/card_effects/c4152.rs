use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let random_enemies = game.enemy_units(owner);
      game.smart_random_damage(random_enemies, 2, my_id).await;
    })
  )
  .into()],
  on_play: None
});
