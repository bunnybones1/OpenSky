use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          game
            .give_hand_cards(
              owner,
              |c| c.is_spell() && c.cost >= 7,
              vec![Modifier::ModifyCost(-1)],
              my_id,
            )
            .await;

          game.context().mutate_secret(owner, |secret| {
            let spells_in_deck: Vec<_> = secret
              .deck()
              .iter()
              .filter(|c| {
                secret.instance(**c).unwrap().is_spell() && secret.instance(**c).unwrap().cost >= 7
              })
              .copied()
              .collect();
            for card in spells_in_deck {
              secret
                .secret
                .apply_modifier(card.into(), Modifier::ModifyCost(-1), my_id, secret.log)
                .unwrap();
            }
          });
        })
      },
    }
  }))
});
