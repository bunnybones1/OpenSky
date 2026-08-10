use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let amt = 3 * ((max_mana as f32 / 5.).floor()) as i8;
        game.berf(my_id, amt, amt).await;
      })
    }
  ))
});
