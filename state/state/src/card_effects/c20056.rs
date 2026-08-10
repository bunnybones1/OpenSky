use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,

    mutate: |game, _, target, _| {
      Box::pin(async move {
        if let Some(attachment_id) = target.instance(game, None).unwrap().attachment() {
          if attachment_id.instance(game, None).unwrap().is_spell() {
            game
              .move_to_zone(attachment_id, Zone::Hand { public: true })
              .await;
          }
        }
        game.change_health(target, 2).await;
        game.give_spell(target, enchant::SHIELD).await;
      })
    },
  }
});
