use crate::card::ModifyHealthReason;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if game.current_player != owner {
        return None;
      }
      if let Ok(&PhaseModifyCard {
        card,
        modifier: Modifier::ModifyHealth(health, reason),
        ..
      }) = phase.try_into()
      {
        let is_damage = matches!(reason, Some(ModifyHealthReason::Damage(..)));
        if card.id() == Some(game.hero_id(owner)) && health < 0 && is_damage {
          return Some(
            PhaseModifyCard {
              card,
              modifier: Modifier::ModifyHealth(0, reason),
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
