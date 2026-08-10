use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::ModifyHealth(1, None),
              Modifier::ModifyPower(1, None),
              Modifier::GrantTrait(Trait::Guard),
            ],
          )
          .await;
        let hero = game.hero_id(owner);

        game
          .move_to_zone(
            my_id,
            Zone::Attachment {
              parent: hero.into(),
            },
          )
          .await;
        game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
      })
    },
  }
});
