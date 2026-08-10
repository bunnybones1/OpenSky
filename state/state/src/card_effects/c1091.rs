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
        modifier: Modifier::ModifyHealth(health, reason),
        source,
      }) = phase.try_into()
      {
        if card.id() == Some(game.hero_id(enemy(owner))) && health > 0 {
          return Some(
            PhaseModifyCard {
              card,
              modifier: Modifier::ModifyHealth(0, reason),
              source,
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
