use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let discount = game.player(owner).this_turn_stats.num_hero_attacks as i8;
      -discount
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, _owner| {
      Box::pin(async move {
        let dmg = 5;
        game.damage(target, dmg, my_id).await;
      })
    }
  }
});
