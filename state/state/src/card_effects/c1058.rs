use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player(owner).mana == 0 {
      game.ready(my_id).await;
      game
        .modify_card(my_id, vec![Modifier::GrantTrait(Trait::Guard)])
        .await;
    }
  }))
  .into()],
  on_play: None
});
