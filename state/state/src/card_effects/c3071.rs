use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      match phase.try_into() {
        Ok(&PhaseModifyCard {
          card,
          modifier: Modifier::ModifyHealth(health_delta, reason),
          source,
        }) if game.reveal_from_card(card, |c| c.zone.is_field()).await
          && game.owner(card.id().unwrap()) == owner
          && health_delta > 0 =>
        {
          Some(
            PhaseModifyCard {
              card,
              modifier: Modifier::ModifyHealth(health_delta + 1, reason),
              source,
            }
            .into(),
          )
        }
        _ => None,
      }
    })
  }
  .into()],
  on_play: None
});
