use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_death!(|game, my_id, _| Box::pin(async move {
      let owner = game.owner(my_id);
      shroom_effect(game, owner, my_id).await;
    }))
    .into(),
    unit_slay!(|game, my_id, _target| Box::pin(async move {
      let owner = game.owner(my_id);
      shroom_effect(game, owner, my_id).await;
    }))
    .into()
  ],
  on_play: None
});

async fn shroom_effect(game: &mut LiveGame<'_>, owner: u8, my_id: InstanceID) {
  let buffs = vec![
    Modifier::ModifyPower(1, None),
    Modifier::ModifyHealth(1, None),
  ];

  game
    .give_hand_cards(owner, |c| c.is_unit(), buffs, my_id)
    .await;
}
