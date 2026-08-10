use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        for player in 0..2u8 {
          let dead_units: Vec<_> = game
            .graveyard::<&CardInstance<SkyWeaver>>(player)
            .into_iter()
            .filter(|c| c.is_unit())
            .take(6)
            .map(|c| c.id())
            .collect();

          for id in &dead_units {
            if game.player_has_room_for_unit(player) {
              game.summon(*id).await;
            }
            if game.is_on_field(*id) {
              game
                .modify_card_single(id, Modifier::GrantTrait(Trait::Guard))
                .await;
            }
          }
        }
      })
    },
  }
});
