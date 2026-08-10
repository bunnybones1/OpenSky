use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.fight(hero, target).await;
        game
          .move_to_zone(
            my_id,
            Zone::Attachment {
              parent: hero.into(),
            },
          )
          .await;
        game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
      })
    },
  }
});
