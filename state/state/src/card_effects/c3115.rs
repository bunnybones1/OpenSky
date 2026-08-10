use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.give_spell(target, BaseCard::C20049).await;
        game.kill(target).await;
        let enemies = game.characters(enemy(owner));
        game.damage_many(&enemies, 3, target).await;
      })
    },
  }
});
