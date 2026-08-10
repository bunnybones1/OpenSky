use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let my_mana = game.player(owner).mana;
        let cost = my_id.instance(game, None).unwrap().cost.into();
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          if let Some(id) = game
            .draw_high_cost_x_or_less(owner, (owner, Zone::Field), cost, |_, _| true)
            .await
          {
            game.give_spell(id, enchant::LEAD).await;
          }
        }
      })
    },
  }
});
