use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mut rng = game.context().random().await;
        for _ in 0..6 {
          let allies = game.units::<Card>(owner);
          let random_ally = allies.choose(&mut rng);
          if let Some(random_ally) = random_ally {
            game
              .modify_card(
                random_ally,
                vec![
                  Modifier::ModifyPower(1, None),
                  Modifier::ModifyHealth(1, None),
                  Modifier::GrantTrait(Trait::Guard),
                ],
              )
              .await;
          }
        }
      })
    },
  }
});
