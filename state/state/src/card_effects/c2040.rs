use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: |g, _, p, _, c| {
        let o = g.owner(c);
        let c = c.instance(g, None).unwrap();
        o != p && c.is_unit() && c.cost <= 1
      },
      mutate: |game, _my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            game
              .run(PhaseMoveToZone {
                card: target.into(),
                zone: Zone::Deck,
                player: owner,
              })
              .await;
          }
        })
      },
    }
  }))
});
