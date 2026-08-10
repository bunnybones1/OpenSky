use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);
        let players = [owner, enemy_player];

        for p in &players {
          if let Some(max_pwr) = game
            .units::<&CardInstance<SkyWeaver>>(*p)
            .into_iter()
            .enumerate()
            // sort by highest cost, so we get the right highest cost card.
            .max_by_key(|(i, c)| (c.power, *i))
            .map(|(_, c)| c.id())
          {
            game.kill(max_pwr).await;
          }
        }
      })
    },
  }
});
