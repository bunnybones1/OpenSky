use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..4 {
          if !game.player_has_room_for_unit(owner) {
            // out of space on field
            return;
          }

          game
            .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, card| {
              Box::pin(async move {
                game
                  .modify_card(card, vec![Modifier::GrantTrait(Trait::Guard)])
                  .await;
              })
            })
            .await;
        }
      })
    },
  }
});
