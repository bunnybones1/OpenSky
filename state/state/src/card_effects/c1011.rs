use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    game.give_spell(my_id, BaseCard::C20014).await;
  }))
  .into()],
  on_play: None
});
