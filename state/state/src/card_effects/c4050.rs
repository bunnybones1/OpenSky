use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let dead_spells: Vec<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_spell())
          .map(|c| c.id())
          .take(2)
          .collect();
        for id in dead_spells {
          game.move_to_zone(id, Zone::Hand { public: true }).await;
        }
        game.dust(my_id).await;
      })
    },
  }
});
