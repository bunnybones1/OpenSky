use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, s, p, i, t| targets::ally_unit(g, s, p, i, t)
      && t
        .instance(g, None)
        .unwrap()
        .effects
        .iter()
        .any(|e| e.effect().effect_types().any(|t| t == EffectType::Death)),
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let death: ResolvedPhase = ResolvedPhaseMoveToZone {
          card: target.into(),
          from: CardLocation {
            player: target_owner,
            location: Some((Zone::Field, None)),
          },
          to: (target_owner, Zone::Graveyard),
        }
        .into();
        let triggers = game.get_active_public_triggers().2;

        for trigger in triggers.into_iter().filter(|trigger| {
          trigger.instance() == target && trigger.get().effect_type == EffectType::Death
        }) {
          let mut queue = Queue::default();
          (trigger.get().run)(
            game,
            &mut queue,
            target,
            death.clone(),
            trigger.card_effect(),
          )
          .await;
          for fire in queue.into_inner() {
            game
              .run(PhaseResolveTrigger {
                id: target,
                effect: trigger.card_effect(),
                effect_type: trigger.get().effect_type,
                fire,
              })
              .await;
          }
        }
      })
    },
  }
});
