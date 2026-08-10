use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let target_base = target.instance(game, None).unwrap().base();
        let base_copy = game.create_card(owner, *target_base).await;
        game
          .move_to_zone(base_copy, Zone::Hand { public: true })
          .await;
      })
    },
  }
});
