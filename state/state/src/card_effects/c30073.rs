use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let all_units = game.all_units();
        game.give_spell_many(&all_units, enchant::FURY).await;
        if game.reveal_from_card(my_id, |c| c.cost >= 8).await {
          if game.dust(my_id).await {
            let ally_units: Vec<InstanceID> = game.units(owner);
            for card in ally_units {
              game.berf(card, 8, 8).await;
            }
          }
        } else {
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
