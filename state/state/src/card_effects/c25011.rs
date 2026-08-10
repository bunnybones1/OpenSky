use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _owner| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::GrantTrait(Trait::Dash),
              Modifier::GrantTrait(Trait::Wither),
              Modifier::SetHealth(1.into()),
            ],
          )
          .await;
      })
    },
  }
});
