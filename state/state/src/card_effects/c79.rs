use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let card = game.create_card(owner, BaseCard::C20026).await;
        game.move_to_zone(card, Zone::Hand { public: true }).await;
      })
    },
  }
});
