use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      if game.player(owner).this_turn_stats.hero_attacked {
        -5
      } else {
        0
      }
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let cost = my_id.instance(game, None).unwrap().cost;
        let card = game
          .draw_high_cost_x_or_less(
            owner,
            (owner, Zone::Hand { public: false }),
            cost.into(),
            |c, _| c.is_spell(),
          )
          .await;
        if let Some(card) = card {
          // OK to reveal, because the card is public.
          let current_cost_without_modifiers =
            game.reveal_from_card(card, |c| c.instance.cost).await;
          let delta = i8::from(current_cost_without_modifiers);
          // decrease cost now
          game
            .modify_card(card, vec![Modifier::ModifyCost(-delta)])
            .await;

          // and queue up increase later. This modifier gets wiped if the card gets reset :)
          game
            .grant_modifier_for_turns(
              card,
              my_id,
              Modifier::ApplyAtTurnEnd(Box::new(Modifier::ModifyCost(delta))),
              0,
              1,
            )
            .await;
        }
      })
    },
  }
});

attachable_effect!(
  struct SonicSignal();,
  SONICSIGNAL,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![]
  }
);
