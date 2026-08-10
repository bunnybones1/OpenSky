use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card: dead_card,
          from:
            CardLocation {
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
        }) = phase.try_into()
        {
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          let owner = game.owner(my_id);
          if game.owner(id) == owner {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let lowest_hp_in_hand = game
                  .lowest_stat_cards_in_hand_indexes(owner, |c, _| c.is_unit(), |c, _| c.health)
                  .await;
                let picked = if lowest_hp_in_hand.is_empty() {
                  None
                } else if lowest_hp_in_hand.len() == 1 {
                  Some(lowest_hp_in_hand[0])
                } else {
                  let mut rng = game.context().random().await;
                  lowest_hp_in_hand.choose(&mut rng).copied()
                };
                if let Some(picked) = picked {
                  let card = game.hand_card(owner, picked);
                  game.berf(card, 2, 1).await;
                }
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
