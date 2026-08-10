use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Targeted {
    does_target: |game, secret, _, card_id, target_id| {
      let target = target_id.instance(game, None).unwrap();
      let this_cost = card_id.instance(game, Some(secret)).unwrap().cost;
      target.is_unit()
        && target.view.cost <= this_cost
        && game.owner(target_id) != game.owner(card_id)
    },
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let cost: i32 = my_id.instance(game, None).unwrap().cost.into();
        game.bounce(target).await;
        game.change_mana(owner, -cost).await;
      })
    },
  }
});
