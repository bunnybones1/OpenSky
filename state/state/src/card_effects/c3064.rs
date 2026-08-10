use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let health = game.reveal_from_card(target, |c| c.health).await;
        game.kill(target).await;
        let hero = game.hero_id(target_owner);
        game.change_health(hero, health.into()).await;
        game.change_max_mana(target_owner, 1).await;
      })
    },
  }
});
