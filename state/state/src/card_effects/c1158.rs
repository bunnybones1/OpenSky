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
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.instantiate_and_summon(owner, BaseCard::C1136).await;
        }
      })
    },
  }
});
