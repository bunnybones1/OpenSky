use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseResolveCardEffect {
          id,
          played_by_unit: false,
          target_id,
          ..
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          let phase_card_owner = game.owner(id);
          let Some(target_id) = target_id else { return };
          if phase_card_owner == my_owner
            && game
              .reveal_from_card(target_id, move |c| c.owner == my_owner && c.zone.is_field())
              .await
            && game.reveal_from_card(id, |c| c.is_spell()).await
          {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                let blades = [
                  BaseCard::C37,
                  BaseCard::C82,
                  BaseCard::C87,
                  BaseCard::C132,
                  BaseCard::C182,
                  BaseCard::C183,
                  BaseCard::C1000,
                  BaseCard::C1027,
                ];
                let mut rng = game.context().random().await;
                let random_blade = blades.iter().choose(&mut rng).unwrap();
                let created_card = game.create_card(my_owner, *random_blade).await;
                game
                  .move_to_zone(created_card, Zone::Hand { public: true })
                  .await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
