use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game.instantiate_and_summon(owner, BaseCard::C20001).await;
  }))
  .into()],
  on_play: None
});
