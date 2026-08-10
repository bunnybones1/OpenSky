use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, s, p, i, c| {
      targets::ally_unit(g, s, p, i, c) && {
        let c = c.instance(g, None).unwrap();
        c.attack_state == AttackState::Sleeping
      }
    },

    mutate: |game, _, target, _owner| {
      Box::pin(async move {
        game.ready(target).await;
        let card = target.instance(game, None).unwrap();
        let element = card.element;
        game
          .draw_low_cost_spell_onto(target, move |c, _| c.element == element)
          .await;
      })
    },
  }
});
