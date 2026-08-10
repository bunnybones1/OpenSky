use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    game.give_spell(my_id, BaseCard::C20022).await;
  }))
  .into()],
  on_play: None
});
