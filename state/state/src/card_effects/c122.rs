use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C122, |c| is_armis_guard(*c.base()));

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);

    game.instantiate_and_summon(owner, BaseCard::C20001).await;

    game.add_global_modifier(
      owner,
      my_id,
      vec![Modifier::GrantTrait(Trait::Wither)],
      SerializableFilter::C122,
    );
  }))
  .into()],
  on_play: None
});
