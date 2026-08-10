use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let current_mana: i8 = game.player(owner).mana.into();
        game.berf(my_id, current_mana, current_mana).await;
        game.change_mana(owner, -current_mana as i32).await;
      })
    }
  ))
});
