use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C20070, |c| c.base()
  == &BaseCard::C20069);

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    game.add_global_modifier(
      owner,
      my_id,
      vec![
        Modifier::ModifyHealth(1, None),
        Modifier::ModifyPower(1, None),
      ],
      SerializableFilter::C20070,
    );
  }))
  .into()],
  on_play: None
});
