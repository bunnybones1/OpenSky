use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: |game, _secret, _owner, _my_id, target| {
        let target_owner = game.owner(target);

        target.instance(game, None).unwrap().is_hero()
          && !game
            .graveyard::<&CardInstance<SkyWeaver>>(target_owner)
            .is_empty()
      },
      mutate: |game, my_id, target, _owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_owner = game.owner(target);
            let top_dead_card: InstanceID = *game
              .graveyard(target_owner)
              .get(0)
              .expect("There is at least card in target's graveyard");
            let element = game.reveal_from_card(top_dead_card, |c| c.element).await;
            if game.dust(top_dead_card).await {
              game
                .modify_card(my_id, vec![Modifier::SetElement(element)])
                .await;
            }
          }
        })
      },
    }
  ))
});
