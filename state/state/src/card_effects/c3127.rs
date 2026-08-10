use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        game.kill(target).await;
        game.cleanup_dead_units().await;

        if game
          .reveal_from_card(target, |c| c.zone.is_graveyard())
          .await
          && game.player_has_room_for_unit(owner)
        {
          game.summon(target).await;

          game
            .modify_card(target, vec![Modifier::GrantTrait(Trait::Dash)])
            .await;
          game.give_spell(target, enchant::SHIELD).await;
        }
      })
    },
  }
});
