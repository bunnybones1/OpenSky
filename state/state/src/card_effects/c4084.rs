use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let num_spells_cast_this_turn =
          1 + game.player(owner).this_turn_stats.num_spells_cast as i8;
        game
          .modify_card_single(
            target,
            Modifier::ModifyHealth(-num_spells_cast_this_turn, None),
          )
          .await;
      })
    },
  }
});
