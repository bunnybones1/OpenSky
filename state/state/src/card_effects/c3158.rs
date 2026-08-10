use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let top_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .find(|c| c.is_unit())
          .map(|c| c.id());

        if let Some(id) = top_dead_unit {
          if game.player_has_room_for_unit(owner) {
            game
              .modify_card(
                id,
                vec![Modifier::SetPower(4.into()), Modifier::SetHealth(4.into())],
              )
              .await;
            game.summon(id).await;
          }
        }
      })
    },
  }
});
