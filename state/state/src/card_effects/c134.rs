use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);

      if let Ok(&PhaseModifyCard {
        card,
        modifier: Modifier::ModifyPower(amt, reason),
        ..
      }) = phase.try_into()
      {
        if game
          .reveal_from_card(card, |c| c.zone.is_field() && c.is_unit())
          .await
          && game.owner(card.id().unwrap()) == owner
          && amt > 0
        {
          return Some(
            PhaseModifyCard {
              card,
              modifier: Modifier::ModifyPower(amt + 1, reason),
              source: my_id,
            }
            .into(),
          );
        }
      }
      None
    }),
  }
  .into()],
  on_play: None
});
