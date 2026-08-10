use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, _, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, Zone::Field),
          from,
        }) = phase.try_into()
        {
          if !from.is_field()
            && unit_owner == owner
            && card.id() != Some(my_id)
            && game
              .reveal_from_card(card, |c| {
                c.element == Element::Dark || c.element == Element::Light
              })
              .await
          {
            game.berf(card, 1, 1).await;
          }
        }
      })
    }
  }
  .into(),],
  on_play: None
});
