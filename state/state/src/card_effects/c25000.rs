use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);

        let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, Zone::Field),
          from,
        }) = phase.try_into()
        else {
          return;
        };
        if !from.is_casting() || game.current_player != owner || unit_owner != owner {
          return;
        }

        let is_silenced = my_id.instance(game, None).unwrap().is_silenced;
        if is_silenced {
          return;
        }

        game
          .run_instant_trigger(BaseCard::C25000, my_id, EffectType::Generic, move |game| {
            Box::pin(async move {
              game
                .modify_card_single(card, Modifier::ModifyPower(1, None))
                .await;
            })
          })
          .await;
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
attachable_effect!(
  struct PassiveAbility();,
  PASSIVEABILITY,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![]
  }
);
