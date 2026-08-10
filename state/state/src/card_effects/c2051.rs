use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          let filter = move |c: &CardInstance<SkyWeaver>| c.is_unit();
          let modifiers = vec![
            Modifier::ModifyHealth(2, None),
            Modifier::ModifyPower(1, None),
          ];
          game
            .give_hand_cards(owner, filter, modifiers.clone(), my_id)
            .await;
          game
            .give_deck_cards(owner, filter, modifiers.clone(), my_id)
            .await;
        })
      },
    }
  }))
});
