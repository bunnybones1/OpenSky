use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let to_hand = vec![BaseCard::C20014, BaseCard::C20017, BaseCard::C20022];
        for base in to_hand {
          let id = game.create_card(owner, base).await;
          game.move_to_zone(id, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
