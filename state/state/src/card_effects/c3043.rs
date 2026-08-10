use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          let dead_units: Vec<_> = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.is_unit())
            .map(|c| c.id())
            .collect();

          if let Some(to_revive) = dead_units.first() {
            game
              .modify_card(
                *to_revive,
                vec![Modifier::SetPower(5.into()), Modifier::SetHealth(5.into())],
              )
              .await;
            game.summon(*to_revive).await;
            game
              .modify_card(*to_revive, vec![Modifier::GrantTrait(Trait::Banner)])
              .await;
            game.give_spell(*to_revive, enchant::SHIELD).await;
          }
        }
      })
    },
  }
});
