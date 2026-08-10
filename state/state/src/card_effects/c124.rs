use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C124, |c| is_armis_guard(*c.base()));

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);

    let armored_guard = game.create_card(owner, BaseCard::C20001).await;
    game
      .move_to_zone(armored_guard, Zone::Hand { public: true })
      .await;

    game.add_global_modifier(
      owner,
      my_id,
      vec![Modifier::ModifyPower(1, None)],
      SerializableFilter::C124,
    );
  }))
  .into()],
  on_play: None
});
