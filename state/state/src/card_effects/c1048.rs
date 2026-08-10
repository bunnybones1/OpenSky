use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, id, target, owner| {
      Box::pin(async move {
        game.give_spell(target, enchant::CHAINS).await;

        let damage = 1;
        let enemy_player = enemy(owner);
        let targets_to_damage = game.characters(enemy_player);

        game.damage_many(&targets_to_damage, damage, id).await;
      })
    },
  }
});
