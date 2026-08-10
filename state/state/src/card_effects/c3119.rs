use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game
            .instantiate_and_run_and_summon(owner, BaseCard::C3010, |g, c| {
              Box::pin(async move {
                g.modify_card_single(c, Modifier::GrantTrait(Trait::Dash))
                  .await;
              })
            })
            .await;
        }
      })
    },
  }
});
