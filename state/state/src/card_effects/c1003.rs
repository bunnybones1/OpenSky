use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, id, target, _| {
      Box::pin(async move {
        let damage = 5;
        game.give_spell(target, enchant::SHROUD).await;

        let units_to_damage: Vec<_> = game
          .all_units()
          .into_iter()
          .filter(|u| u != &target)
          .collect();

        game.damage_many(&units_to_damage, damage, id).await;
      })
    },
  }
});
