use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game
            .instantiate_and_run_and_summon(owner, BaseCard::C20003, |game, id| {
              Box::pin(async move {
                game.change_health(id, 1).await;
              })
            })
            .await;
        }
        let enemy_units: Vec<Card> = game.enemy_units(owner);

        let mut attach: Vec<PhaseMoveToZone> = Vec::new();
        for unit_ptr in enemy_units {
          let card = game.create_card(owner, enchant::ROOTS).await;
          attach.push(PhaseMoveToZone {
            card: card.into(),
            player: owner,
            zone: Zone::Attachment { parent: unit_ptr },
          })
        }
        game.run_parallel(attach).await;
      })
    },
  }
});
