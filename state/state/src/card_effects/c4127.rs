use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        while game.player_has_room_for_unit(owner) {
          let top_dead_spell = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .find(|c| c.is_spell() && c.cost >= 1)
            .map(|c| (c.id(), c.base().instance().cost));
          if let Some(top_dead_spell) = top_dead_spell {
            game
              .instantiate_and_run_and_summon(owner, BaseCard::C20063, |game, c| {
                Box::pin(async move {
                  game
                    .modify_card(
                      c,
                      vec![
                        Modifier::SetHealth(top_dead_spell.1),
                        Modifier::SetPower(top_dead_spell.1),
                      ],
                    )
                    .await;
                  game.dust(top_dead_spell.0).await;
                })
              })
              .await;
          } else {
            break;
          }
        }
      })
    },
  }
});
