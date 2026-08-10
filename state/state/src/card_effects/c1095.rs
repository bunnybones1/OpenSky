use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id: InstanceID| Box::pin(async move {
      let owner = game.owner(my_id);
      game
        .aura_cards_have(enemy(owner), my_id, |_| true, vec![Modifier::NoTraits], 2)
        .await;
    }),
    AuraLayer::Internal,
    true
  )
  .into()],
  on_play: None
});
