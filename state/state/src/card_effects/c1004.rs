use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    game.draw_spell_onto(my_id, |c, _| c.cost == 1).await;
  }))
  .into()],
  on_play: None
});
