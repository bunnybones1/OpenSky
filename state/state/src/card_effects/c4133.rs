use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, _my_id, owner| Box::pin(async move {
    if game.player(owner).this_turn_stats.num_spells_cast > 0 {
      for _ in 0..2 {
        game.instantiate_and_summon(owner, BaseCard::C20063).await;
      }
    }
  }))
  .into()],
  on_play: None
});
