use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let element = target.instance(game, None).unwrap().element;
        game
          .draw_low_cost_spell_onto(target, move |c, _| c.element == element)
          .await;
      })
    },
  }
});
