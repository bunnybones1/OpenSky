use super::effect_helpers::*;

attachable_effect!(
  struct OohShiny([Option<InstanceID>; 3]);,
  OOHSHINEY,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |zone, _| zone.is_field(),
      run: |game, _, _, phase, card_effect| Box::pin(async move {
        if let (Ok(ResolvedPhaseEndTurn { .. }), CardEffect::OohShiny(cards_to_dust)) =
          (phase.try_into(), card_effect)
        {
          for card in cards_to_dust.iter().flatten() {
            if game.reveal_from_card(card, |c| c.zone.is_hand()).await {
              game.dust(card).await;
            }
          }
        }
      })
    }
    .into()]
  }
);

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let mut cards_to_dust = [None, None, None];
        for card in &mut cards_to_dust {
          let owner = game.owner(my_id);
          if let Some(conjure) = game.conjure(owner, |c, _| c.cost == 1).await {
            *card = Some(game.reveal_from_card(conjure, |c| c.id()).await);
          }
        }
        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::OohShiny(cards_to_dust)),
            0,
            1,
          )
          .await;
      })
    },
  }
});
