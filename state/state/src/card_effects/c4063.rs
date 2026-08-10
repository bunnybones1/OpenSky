use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      game
        .aura_cards_have(
          owner,
          my_id,
          |c| c.is_spell(),
          vec![Modifier::GrantTrait(Trait::Lifesteal)],
          0,
        )
        .await;
    }),
    AuraLayer::OtherKeyword
  )
  .into()],
  on_play: None
});
