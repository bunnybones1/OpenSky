use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let element = target.instance(game, None).unwrap().element;
        let all_units_with_element: Vec<_> = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .filter(|c| c.element == element)
          .map(|token| token.id())
          .collect();
        game.damage_many(&all_units_with_element, 3, my_id).await;
      })
    },
  }
});
