use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let heal = game.all_characters::<&CardInstance<SkyWeaver>>().len();
        game
          .change_health(target, SaturatingU8::from(heal).into())
          .await;
      })
    },
  }
});
