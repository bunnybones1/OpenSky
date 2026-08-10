use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);

        if let Some(max_health) = game
          .units::<&CardInstance<SkyWeaver>>(enemy_player)
          .into_iter()
          .enumerate()
          // sort by highest cost, so we get the right highest cost card.
          .max_by_key(|(i, c)| (c.health, *i))
          .map(|(_, c)| c.id())
        {
          game.kill(max_health).await;
        }
      })
    },
  }
});
