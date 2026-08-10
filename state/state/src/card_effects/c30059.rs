use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        game.damage(target, 3, my_id).await;
        let unit = target.instance(game, None).unwrap();
        if !unit.is_hero() && unit.marked_for_death.is_some() {
          game.dust(target).await;
        }
      })
    },
  }
});
