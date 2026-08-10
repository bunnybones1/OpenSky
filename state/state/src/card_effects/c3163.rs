use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let dead_units: Vec<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .map(|c| c.id())
          .take(2)
          .collect();
        for id in &dead_units {
          if game.player_has_room_for_unit(owner) {
            game.summon(*id).await;
            game
              .modify_card_single(*id, Modifier::GrantTrait(Trait::Guard))
              .await;
          }
        }
      })
    },
  }
});
