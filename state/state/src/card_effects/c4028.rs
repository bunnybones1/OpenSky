use super::effect_helpers::*;
intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let gy = game.graveyard::<InstanceID>(enemy(owner));
    let top_dead_enemy_card = gy.get(0);
    if let Some(top_dead_enemy_card) = top_dead_enemy_card {
      if game.dust(top_dead_enemy_card).await {
        let element = game
          .reveal_from_card(top_dead_enemy_card, |c| c.element)
          .await;
        game
          .draw_low_cost_spell_onto(my_id, move |c, _| c.element == element)
          .await;
      }
    }
  }))
  .into()],
  on_play: None
});
