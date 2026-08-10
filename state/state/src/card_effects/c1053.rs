use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let my_owner = game.owner(my_id);
      let my_hero = game.hero_id(my_owner);
      game
        .add_aura_modifier(my_hero, my_id, Modifier::GrantTrait(Trait::Lifesteal), 0)
        .await;
    }),
    AuraLayer::FieldKeyword
  )
  .into()],
  on_play: None
});
