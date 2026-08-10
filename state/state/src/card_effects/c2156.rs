use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let amt = ((max_mana as f32 / 5.).floor() + 1.) as i8;

        for _ in 0..amt {
          game.berf(target, 1, 2).await;
        }
      })
    },
  }
});
