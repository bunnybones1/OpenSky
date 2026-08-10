use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let id = game
      .draw_spell_onto(my_id, |c, _| c.element == Element::Mind)
      .await;
    if let Some(id) = id {
      let previous_cost = game.reveal_from_card(id, |c| c.instance.cost).await;
      game.modify_card(id, vec![Modifier::ModifyCost(-8)]).await;
      game
        .grant_modifier_for_turns(
          id,
          my_id,
          Modifier::ApplyAtTurnEnd(Box::new(Modifier::SetCost(previous_cost))),
          0,
          1,
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});
