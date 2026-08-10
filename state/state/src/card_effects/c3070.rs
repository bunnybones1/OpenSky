use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let allies = game.characters::<InstanceID>(owner);
        let lowest_hp = allies
          .iter()
          .filter_map(|c| {
            let instance = c.instance(game, None).unwrap();
            if instance.marked_for_death.is_some() {
              None
            } else {
              Some((c, instance.health))
            }
          })
          .sorted_by(|a, b| a.1.cmp(&b.1))
          .take(3);

        for (id, _) in lowest_hp {
          game.give_spell(id, enchant::VAPORS).await;
        }
      })
    },
  }
});
