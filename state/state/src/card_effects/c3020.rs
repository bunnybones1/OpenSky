use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, _, c| c.instance(g, None).unwrap().is_unit(),
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.change_power(target, -2).await;

        let (power, health) = game
          .reveal_from_card(target, |c| (c.instance().power, c.instance().health))
          .await;
        game
          .modify_card(
            target,
            vec![Modifier::SetPower(health), Modifier::SetHealth(power)],
          )
          .await;

        game.give_spell(target, enchant::DAZED).await;
      })
    },
  }
});
