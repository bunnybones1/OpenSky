use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);

    game.instantiate_and_summon(owner, BaseCard::C20013).await;
    game.instantiate_and_summon(owner, BaseCard::C20013).await;

    let hand_cards = game.hand_cards(owner);
    let has_7_cost_or_higher_card_in_hand =
      game.reveal_if_any(hand_cards, |card| card.cost >= 7).await;
    if has_7_cost_or_higher_card_in_hand {
      let buffs = vec![
        Modifier::ModifyPower(1, None),
        Modifier::ModifyHealth(1, None),
      ];
      game
        .run_parallel(
          game
            .units::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .map_into::<Card>()
            .flat_map(|card| {
              vec![
                PhaseModifyCard {
                  card,
                  modifier: buffs[0].clone(),
                  source: my_id,
                },
                PhaseModifyCard {
                  card,
                  modifier: buffs[1].clone(),
                  source: my_id,
                },
              ]
            })
            .collect(),
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});
