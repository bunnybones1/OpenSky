use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally,
      mutate: |game, _my_id, target, owner| {
        Box::pin(async move {
          let cards_in_hand: SaturatingU8 = game.player_cards(owner).hand().len().into();
          if let Some(t) = target {
            game
              .modify_card(t, vec![Modifier::ModifyHealth(cards_in_hand.into(), None)])
              .await;
          }
        })
      },
    }
  ))
});
