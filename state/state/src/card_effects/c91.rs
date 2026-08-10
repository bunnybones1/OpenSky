use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let damage = {
          let card = target.instance(game, None).unwrap();
          // armor
          let armor = card.traits.contains(&Trait::Armor);
          // guard
          let guard = card.traits.contains(&Trait::Guard);

          if armor || guard {
            5
          } else {
            2
          }
        };
        game.damage(target, damage, my_id).await;
      })
    },
  }
});
