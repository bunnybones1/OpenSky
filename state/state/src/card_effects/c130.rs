use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.berf(target, 3, 3).await;
        let half_power = (i8::from(target.instance(game, None).unwrap().power) / 2) as f32;
        let cost = half_power.floor() as i8;
        for _ in 0..2 {
          game.draw_into_play(owner, move |c, _| c.cost == cost).await;
        }
      })
    },
  }
});
