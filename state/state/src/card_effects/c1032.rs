use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let bee = game.create_card(owner, BaseCard::C1026).await;
          game.move_to_zone(bee, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
