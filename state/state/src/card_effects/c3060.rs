use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let num_units_in_grave = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .count();

        game
          .damage(
            target,
            u8::try_from(num_units_in_grave).unwrap_or(std::u8::MAX),
            my_id,
          )
          .await;
      })
    },
  }
});
