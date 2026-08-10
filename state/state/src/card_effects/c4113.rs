use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      if game.units::<InstanceID>(owner).is_empty() {
        -1
      } else {
        0
      }
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..3 {
          game.instantiate_and_summon(owner, BaseCard::C20058).await;
        }
      })
    },
  }
});
