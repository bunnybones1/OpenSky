use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, phase| Box::pin(async move {
      let ResolvedPhaseResolveCardEffect { id: played_id, .. } = phase;
      let owner = game.owner(my_id);
      if game.dust(played_id).await {
        let random_enemies = game.enemy_field(owner);
        game.smart_random_damage(random_enemies, 2, my_id).await;
      }
    })
  )
  .into()],
  on_play: None
});
