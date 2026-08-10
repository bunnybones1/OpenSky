use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let damage = 3;
        let target = *game.characters::<InstanceID>(enemy(owner)).get(0).unwrap();
        game.damage(target, damage, my_id).await;
      })
    },
  }
});
