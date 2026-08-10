use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::AfterText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            game.dust(my_id).await;
            let clone = game.copy_card(target, true).await;
            game
              .run(PhaseMoveToZone {
                card: clone,
                player: owner,
                zone: Zone::Field,
              })
              .await;
          }
        })
      },
    }
  ))
});
