use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let element = game.reveal_from_card(target, |c| c.element).await;

        if game.dust(target).await {
          let new_unit = game
            .draw_into_play(target_owner, move |c, _| c.element == element)
            .await;
          if target_owner == owner {
            if let Some(unit) = new_unit {
              game.berf(unit, 2, 1).await;
            }
          }
        }
      })
    },
  }
});
