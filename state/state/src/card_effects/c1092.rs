use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        if !game.player_has_room_for_unit(owner) {
          return;
        }
        if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = game
          .run(PhaseDraw {
            from: (owner, CardPool::Anywhere),
            to: (owner, Zone::Limbo { public: true }),
            predicate: Some(Rc::new(|c, _| c.is_unit() && c.cost == 2)),
          })
          .await
          .try_into()
        {
          game.summon(drawn_card).await;

          let hand_cards = game.hand_cards(owner);
          let has_fire_card_in_hand = game
            .reveal_if_any(hand_cards, |card| card.element == Element::Fire)
            .await;
          if has_fire_card_in_hand {
            game.ready(drawn_card).await;
          }
        }
      })
    },
  }
});
