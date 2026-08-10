use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.give_spell(target, enchant::HEX).await;
        if game.player_has_room_for_unit(owner) {
          let copy = game.copy_card(target, true).await;
          game
            .modify_card(
              copy,
              vec![
                Modifier::SetPower(1.into()),
                Modifier::SetHealth(1.into()),
                Modifier::GrantTrait(Trait::Guard),
              ],
            )
            .await;
          game
            .run(PhaseMoveToZone {
              card: copy,
              player: owner,
              zone: Zone::Field,
            })
            .await;
          game.give_spell(copy, enchant::FATE).await;
        }
      })
    },
  }
});
