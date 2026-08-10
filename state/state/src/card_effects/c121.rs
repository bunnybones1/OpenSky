use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C121, |c| is_armis_guard(*c.base()));

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let armored_guard = game.create_card(owner, BaseCard::C20001).await;
    game
      .move_to_zone(armored_guard, Zone::Hand { public: true })
      .await;

    game.add_global_modifier(
      owner,
      my_id,
      vec![Modifier::GrantTrait(Trait::Lifesteal)],
      SerializableFilter::C121,
    );
  }))
  .into()],
  on_play: None
});
