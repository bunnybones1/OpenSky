use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game
          .run_parallel(
            game
              .enemy_units(owner)
              .into_iter()
              .map(|card| PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(-2, None),
                source: my_id,
              })
              .collect(),
          )
          .await;
        let hero_id = game.hero_id(owner);
        game.change_health(hero_id, 2).await;
        game.give_spell(hero_id, BaseCard::C20017).await;
      })
    },
  }
});
