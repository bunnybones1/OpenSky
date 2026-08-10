use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let conjured = game
      .draw_low_cost_spell_onto(my_id, |c, _| c.element == Element::Light)
      .await;
    let hero = game.hero_id(game.owner(my_id));
    if let Some(conjured) = conjured {
      let conjured_cost = game.reveal_from_card(conjured, |c| c.cost).await;
      game.change_health(hero, conjured_cost.into()).await;
    }
  }))
  .into()],
  on_play: None
});
