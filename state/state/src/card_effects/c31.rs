use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C31, |c| c.is_spell());

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          game
            .run_parallel(
              game
                .characters::<&CardInstance<SkyWeaver>>(owner)
                .into_iter()
                .filter(|c| c.id() != my_id)
                .map_into::<Card>()
                .flat_map(|card| {
                  many![PhaseModifyCard {
                    card,
                    modifier: Modifier::GrantTrait(Trait::Armor).clone(),
                    source: my_id
                  },]
                })
                .collect(),
            )
            .await;
        })
      },
    }
  }))
});
