use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    for _ in 0..2 {
      game.instantiate_and_summon(owner, BaseCard::C1004).await;
    }
  }))
  .into()],
  on_play: None
});
