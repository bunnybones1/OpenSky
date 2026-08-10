use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, _, _, my_id, target| {
      let t = target.instance(game, None).unwrap();
      let owner = game.owner(my_id);

      t.is_unit() && t.health <= 3 && game.owner(target) != owner
    },
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.move_to_zone(target, Zone::Deck).await;
      })
    },
  }
});
