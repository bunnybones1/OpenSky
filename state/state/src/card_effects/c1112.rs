use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let power = target.instance(game, None).unwrap().power;
        game
          .modify_card_single(target, Modifier::GrantTrait(Trait::Dash))
          .await;
        game
          .draw(owner, move |c, _| c.is_unit() && c.power == power)
          .await;
      })
    },
  }
});
