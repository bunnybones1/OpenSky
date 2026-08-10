use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let my_mana = game.player(owner).mana;
        let cost = my_id.instance(game, None).unwrap().cost;
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          game.damage(target, cost.into(), my_id).await;
        }
      })
    },
  }
});
