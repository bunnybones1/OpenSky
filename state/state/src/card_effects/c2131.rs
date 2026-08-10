use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let damage = game.player(owner).max_mana;
        game.damage(target, damage.into(), my_id).await;
      })
    },
  }
});
