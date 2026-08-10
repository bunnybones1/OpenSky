use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    game.instantiate_and_summon(owner, BaseCard::C20013).await;
    game.instantiate_and_summon(owner, BaseCard::C20013).await;
  }))
  .into()],
  on_play: None
});
