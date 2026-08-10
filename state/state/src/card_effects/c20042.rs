use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Shroud));

attachable_effect!(
  struct Shroud;,
  SHROUD,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      NormalTrigger {
        effect_type: EffectType::Sunrise,
        priority: -1,
        is_active: is_on_field_not_silenced,
        run: |game, queue, my_id, phase, _| {
          Box::pin(async move {
            if let Ok(ResolvedPhaseStartTurn { player, .. }) = phase.try_into() {
              if player == game.owner(my_id) && game.is_on_field(my_id) {
                let shroud_id = my_id.instance(game, None).unwrap().attachment();
                if let Some(shroud_id) = shroud_id {
                  queue.add_resolution(move |game| {
                    Box::pin(async move {
                      game.dust(shroud_id).await;
                    })
                  });
                }
              }
            }
          })
        },
      }
      .into(),
      unit_aura!(
        |game, my_id| Box::pin(async move {
          game
            .add_aura_modifier(my_id, my_id, Modifier::CantBeTargetedByEnemy, 0)
            .await;
        }),
        AuraLayer::Internal
      )
      .into()
    ]
  }
);
