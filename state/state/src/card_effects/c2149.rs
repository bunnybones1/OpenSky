use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          let max_mana: u32 = game.player(owner).max_mana.into();
          let amt = ((max_mana as f32 / 5.).floor()) as i8;

          for _ in 0..amt {
            game.instantiate_and_summon(owner, BaseCard::C2151).await;
          }
        })
      },
    }
  ))
});
