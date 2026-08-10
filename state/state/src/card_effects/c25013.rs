use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let my_owner = game.owner(my_id);
        let amt = 1 + game.player(my_owner).this_turn_stats.allies_died.len();
        let delta = if target_owner == my_owner { 1 } else { -1 };
        for _ in 0..amt {
          game.berf(target, delta, delta).await;
        }
      })
    },
  }
});
