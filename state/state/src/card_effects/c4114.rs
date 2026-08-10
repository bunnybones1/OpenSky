use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, _, player, _, target| game.player_has_room_for_unit(player)
      && target.instance(game, None).unwrap().is_unit()
      && game.owner(target) == enemy(player),
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          let copy = game.copy_card(target, true).await;
          game
            .modify_card_single(copy, Modifier::GrantTrait(Trait::Dash))
            .await;
          game
            .run(PhaseMoveToZone {
              card: copy,
              player: owner,
              zone: Zone::Field,
            })
            .await;
        }
      })
    },
  }
});
