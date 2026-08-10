use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let enemy_hero = game.hero_id(enemy(owner));

        game.damage(enemy_hero, 2, my_id).await;
        game.change_mana_next_turn(enemy(owner), -2, my_id).await;
      })
    },
  }
});
