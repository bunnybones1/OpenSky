use crate::card::ModifyHealthReason;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);

        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::Evasion),
            0,
            1,
          )
          .await;
      })
    },
  }
});

attachable_effect!(
  struct Evasion;,
  EVASION,
  Effect::Spell {
    on_play: OnPlayEffect::None,
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
          source,
        }) = phase.try_into()
        {
          let is_damage = matches!(reason, Some(ModifyHealthReason::Damage(..)));
          if card.id() == Some(game.hero_id(owner)) && health < 0 && is_damage {
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
  }
);
