use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let target_owner_characters = game.characters::<InstanceID>(target_owner);
        let target_pos = target_owner_characters
          .iter()
          .position(|id| *id == target)
          .unwrap();

        let mut adjacent = vec![];
        if target_pos > 0 {
          adjacent.push(target_owner_characters[target_pos - 1]);
        }
        if target_pos < (target_owner_characters.len() - 1) {
          adjacent.push(target_owner_characters[target_pos + 1]);
        }
        game.damage(target, 6, my_id).await;
        game.damage_many(&adjacent, 3, my_id).await;
      })
    },
  }
});
