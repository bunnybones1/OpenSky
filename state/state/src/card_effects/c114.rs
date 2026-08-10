use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        let unit = game.draw_into_play(owner, |_, _| true).await;
        if let Some(unit) = unit {
          let id = game.reveal_from_card(unit, |c| c.id()).await;
          game.fight(id, target).await;
        }
      })
    },
  }
});
