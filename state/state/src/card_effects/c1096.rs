use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..3 {
          let id = game
            .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, id| {
              Box::pin(async move {
                game.give_spell(id, enchant::HEX).await;
              })
            })
            .await;
          if let Some(id) = id {
            game.ready(id).await;
          }
        }
      })
    },
  }
});
