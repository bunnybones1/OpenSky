use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          let has_required_elements = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.id() != my_id)
            .map(|c| c.base().instance().element)
            .unique()
            .count()
            >= 8;

          if has_required_elements {
            game
              .damage_many(&game.characters(enemy(owner)), 3, my_id)
              .await;
          }
        })
      },
    }
  }))
});
