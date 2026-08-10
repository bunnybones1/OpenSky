use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let targets_to_damage: Vec<_> = game
          .enemy_units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|u| u.power <= 3)
          .map(|token| token.id())
          .collect();

        game.damage_many(&targets_to_damage, 3, my_id).await;
      })
    },
  }
});
