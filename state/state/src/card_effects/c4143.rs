use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let num_spells = game.player(owner).this_turn_stats.num_spells_cast;
        for _ in 0..(num_spells + 1) {
          let enemy_units = game.enemy_units::<InstanceID>(owner);
          game.damage_many(&enemy_units, 1, my_id).await;
        }
      })
    }
  ))
});
