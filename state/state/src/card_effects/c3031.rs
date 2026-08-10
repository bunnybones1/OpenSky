use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, p, _, c| {
      g.player_has_room_for_unit(p) && g.owner(c) != p && {
        let c = c.instance(g, None).unwrap();
        c.is_unit() && c.power <= 2
      }
    },
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          game
            .run(PhaseMoveToZone {
              card: target.into(),
              player: owner,
              zone: Zone::Field,
            })
            .await;
        }
      })
    },
  }
});
