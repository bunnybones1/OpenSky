use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        let element = target.instance(game, None).unwrap().element;
        let (target_power, target_health) = {
          let i = target.instance(game, None).unwrap();
          (i.power, i.health)
        };

        game.kill(target).await;

        let drawn_unit = game
          .draw(owner, move |c, _| c.is_unit() && c.element == element)
          .await;
        if let Some(drawn_unit) = drawn_unit {
          game
            .berf(drawn_unit, target_power.into(), target_health.into())
            .await;
          game
            .move_to_zone(my_id, Zone::Attachment { parent: drawn_unit })
            .await;
          game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
        }
      })
    },
  }
});
