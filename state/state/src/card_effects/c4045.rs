use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, _my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_owner = game.owner(target);
            if game.dust(target).await {
              game
                .instantiate_and_summon(target_owner, BaseCard::C20025)
                .await;
            }
          }
        })
      },
    }
  }))
});
