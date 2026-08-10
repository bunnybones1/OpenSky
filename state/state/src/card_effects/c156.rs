use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let units = game.units::<Card>(owner);
        let mut rng = game.context().random().await;
        let picked = units.iter().choose(&mut rng);
        if let Some(picked) = picked {
          game
            .modify_card_single(picked, Modifier::ModifyPower(1, None))
            .await;
        }
      })
    },
  }
});
