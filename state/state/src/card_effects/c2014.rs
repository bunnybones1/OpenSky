use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    game.berf(my_id, 1, 1).await;
    game.give_spell(my_id, BaseCard::C2006).await;
  }))
  .into()],
  on_play: None
});
