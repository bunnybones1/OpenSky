use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let max_mana: u32 = game.player(owner).max_mana.into();
            let amt = 2 + ((max_mana as f32 / 5.).floor()) as u8;
            game.damage(target, amt, my_id).await;
          }
        })
      },
    }
  ))
});
