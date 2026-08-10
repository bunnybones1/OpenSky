use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_summon!(|game, my_id| Box::pin(async move {
      bfr_effect(game, my_id).await;
    }))
    .into(),
    unit_glory!(|game, my_id, _| Box::pin(async move {
      bfr_effect(game, my_id).await;
    }))
    .into()
  ],
  on_play: None
});

async fn bfr_effect(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let owner = game.owner(my_id);
  let buffs = vec![
    Modifier::ModifyPower(2, None),
    Modifier::ModifyHealth(1, None),
  ];

  game
    .run_parallel(
      game
        .units::<&CardInstance<SkyWeaver>>(owner)
        .into_iter()
        .filter(|c| c.id() != my_id)
        .map_into::<Card>()
        .flat_map(|card| {
          many![
            PhaseModifyCard {
              card,
              modifier: buffs[0].clone(),
              source: my_id
            },
            PhaseModifyCard {
              card,
              modifier: buffs[1].clone(),
              source: my_id
            }
          ]
        })
        .collect(),
    )
    .await;
  game
    .give_hand_cards(owner, |c| c.is_unit(), buffs, my_id)
    .await;
}
