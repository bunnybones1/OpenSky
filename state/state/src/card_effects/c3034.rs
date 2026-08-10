use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let mut rng = game.context().random().await;
      let random_ally = game
        .units::<InstanceID>(owner)
        .into_iter()
        .filter(|id| id != &my_id)
        .choose(&mut rng);
      if let Some(ally) = random_ally {
        game.berf(ally, 1, 1).await;
      }
    })
  )
  .into()],
  on_play: None
});
