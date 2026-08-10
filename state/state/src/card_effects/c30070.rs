use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: |g, s, p, i, t| {
        g.player_has_room_for_unit(p)
          && targets::enemy_unit(g, s, p, i, t)
          && *t.instance(g, None).unwrap().base() != BaseCard::C30065
      },
      mutate: |game, _, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            if game.player_has_room_for_unit(owner) {
              game
                .run(PhaseMoveToZone {
                  card: target.into(),
                  player: owner,
                  zone: Zone::Field,
                })
                .await;
            }
          }
        })
      },
    }
  }))
});
