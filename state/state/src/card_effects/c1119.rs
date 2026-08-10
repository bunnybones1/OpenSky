use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let my_hero = game.hero_id(game.owner(my_id));
        let health = game.reveal_from_card(target, |c| c.health).await;
        game.kill(target).await;
        game.damage(my_hero, health.into(), my_id).await;
      })
    },
  }
});
