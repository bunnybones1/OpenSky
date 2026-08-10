use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, id, owner| {
      Box::pin(async move {
        let damage = 1;
        let enemy_player = enemy(owner);
        let targets_to_damage = game.characters(enemy_player);

        game.damage_many(&targets_to_damage, damage, id).await;
      })
    },
  }
});
