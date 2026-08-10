use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);

        let sleeping_enemies: Vec<_> = game
          .characters::<&CardInstance<SkyWeaver>>(enemy_player)
          .into_iter()
          .filter(|c| c.attack_state == AttackState::Sleeping)
          .map_into()
          .collect();
        game
          .give_spell_many(&sleeping_enemies, enchant::ROOTS)
          .await;
      })
    },
  }
});
