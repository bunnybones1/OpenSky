use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game
            .instantiate_and_run_and_summon(owner, BaseCard::C20003, |game, card| {
              Box::pin(async move {
                game.give_spell(card, enchant::ANIMA).await;
              })
            })
            .await;
        }
      })
    },
  }
});
