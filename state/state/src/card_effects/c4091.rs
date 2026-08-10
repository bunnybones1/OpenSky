use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let enemy_characters = game.characters::<InstanceID>(owner);
        let target_pos = enemy_characters
          .iter()
          .position(|item| *item == target)
          .expect("Target is on the field");

        let mut adjacent_enemies: Vec<Card> = vec![];
        if target_pos > 0 {
          adjacent_enemies.push(enemy_characters.get(target_pos - 1).unwrap().into());
        }
        if target_pos < (enemy_characters.len() - 1) {
          adjacent_enemies.push(enemy_characters.get(target_pos + 1).unwrap().into());
        }
        game.give_spell(target, enchant::SHIELD).await;
        game
          .give_spell_many(&adjacent_enemies, enchant::BARRIER)
          .await;
      })
    },
  }
});
