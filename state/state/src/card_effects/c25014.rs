use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseAuraUpdate) = phase.try_into() {
          let player = game.owner(my_id);
          let mut rng = game.context().random().await;

          let new_picked_ability_base = [
            BaseCard::C25015,
            BaseCard::C25016,
            BaseCard::C25017,
            BaseCard::C25019,
            BaseCard::C25020,
            BaseCard::C25021,
          ];
          let new_picked_ability_base = new_picked_ability_base.iter().choose(&mut rng).unwrap();
          game.dust(my_id).await;
          let new_picked_ability = game.create_card(player, *new_picked_ability_base).await;
          game
            .move_to_zone(new_picked_ability, Zone::HeroAbility)
            .await;
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
pub fn mercurial_effect() -> NormalTrigger {
  NormalTrigger {
    effect_type: EffectType::Sunset,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
          if player == game.owner(my_id) {
            let mut rng = game.context().random().await;
            let my_base = my_id.instance(game, None).unwrap().base();
            let mut new_picked_ability_base = vec![
              BaseCard::C25015,
              BaseCard::C25016,
              BaseCard::C25017,
              BaseCard::C25019,
              BaseCard::C25020,
              BaseCard::C25021,
              BaseCard::C25022,
            ];
            new_picked_ability_base.retain(|b| b != my_base);
            let new_picked_ability_base = new_picked_ability_base.iter().choose(&mut rng).unwrap();
            game.dust(my_id).await;
            let new_picked_ability = game.create_card(player, *new_picked_ability_base).await;
            game
              .move_to_zone(new_picked_ability, Zone::HeroAbility)
              .await;
          }
        }
      })
    },
  }
}
