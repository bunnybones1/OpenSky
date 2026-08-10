use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let total_hero_health_lost = game.player(owner).game_stats.total_hero_health_lost;
      -(total_hero_health_lost as i8)
    },
    AuraLayer::DecreaseCost
  ),
  on_play: None
});
