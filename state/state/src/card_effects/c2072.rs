use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    game
      .draw_low_cost_spell_onto(my_id, |c, _| c.element == Element::Earth)
      .await;
  }))
  .into()],
  on_play: None
});
