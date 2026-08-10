use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            if let Some(attach) = my_id.instance(game, None).unwrap().attachment() {
              game
                .move_to_zone(
                  attach,
                  Zone::Attachment {
                    parent: target.into(),
                  },
                )
                .await;
            }
          }
        })
      },
    }
  }))
});
