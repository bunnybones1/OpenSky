use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let owner = game.owner(my_id);
          let units = game
            .units::<&CardInstance<SkyWeaver>>(owner)
            .iter()
            .map(|c| *c.base())
            .collect::<Vec<_>>();
          if !units.contains(&BaseCard::C20069) && !units.contains(&BaseCard::C20070) {
            game
              .modify_card_single(my_id, Modifier::Silenced(false))
              .await;
          } else {
            game
              .modify_card_single(my_id, Modifier::Silenced(true))
              .await;
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let units = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .iter()
          .map(|c| *c.base())
          .collect::<Vec<_>>();
        if !units.contains(&BaseCard::C20069) && !units.contains(&BaseCard::C20070) {
          game.instantiate_and_summon(owner, BaseCard::C20069).await;
          game.instantiate_and_summon(owner, BaseCard::C20070).await;
        }
      })
    },
  }
});
