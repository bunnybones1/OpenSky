use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let cost = my_id.instance(game, None).unwrap().cost;
        game.damage(target, cost.into(), my_id).await;
      })
    },
  }
});
