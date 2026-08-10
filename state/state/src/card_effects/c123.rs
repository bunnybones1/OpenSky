use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    bulwark_effect(game, my_id).await;
  }))
  .into()],
  on_play: None
});

serializable_filter!(SerializableFilter::C123, |c| is_armis_guard(*c.base()));

async fn bulwark_effect(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let owner = game.owner(my_id);
  game
    .change_all_base_cards(owner, BaseCard::C20001, BaseCard::C20066)
    .await;
  game.instantiate_and_summon(owner, BaseCard::C20001).await;
  game.add_global_modifier(
    owner,
    my_id,
    vec![
      Modifier::ModifyHealth(1, None),
      Modifier::ModifyPower(1, None),
    ],
    SerializableFilter::C123,
  );
}
