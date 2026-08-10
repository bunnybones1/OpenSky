use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.instantiate_and_summon(owner, BaseCard::C20013).await;

        let hero_id = game.hero_id(owner);
        game
          .move_to_zone(
            my_id,
            Zone::Attachment {
              parent: hero_id.into(),
            },
          )
          .await;
        game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
      })
    },
  }
});
