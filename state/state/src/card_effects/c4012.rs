use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, _owner| {
        Box::pin(async move {
          let enemy_player = enemy(game.owner(my_id));
          let enemies = game.characters(enemy_player);
          game.give_spell_many(&enemies, enchant::FROSTBITE).await;
          game
            .damage_many(
              &enemies.iter().map(|c| c.id().unwrap()).collect_vec(),
              1,
              my_id,
            )
            .await;
        })
      },
    }
  }))
});
