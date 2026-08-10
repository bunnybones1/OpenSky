use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.is_spell()).await;
        if game.reveal_from_card(my_id, |c| c.cost <= 7).await {
          game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
          let hero = game.hero_id(owner);
          game
            .move_to_zone(
              my_id,
              Zone::Attachment {
                parent: hero.into(),
              },
            )
            .await;
        }
      })
    },
  }
});
