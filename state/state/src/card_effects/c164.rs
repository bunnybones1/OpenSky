use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _my_id, target, _| {
      Box::pin(async move {
        game.berf(target, 1, 1).await;

        let i = target.instance(game, None).unwrap();
        let cur_pow = i.power;
        let cur_hp = i.health;
        game.berf(target, cur_pow.into(), cur_hp.into()).await;
      })
    },
  }
});
