use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card: dead_card,
          from:
            CardLocation {
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
        }) = phase.try_into()
        {
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          let owner = game.owner(my_id);
          if game.owner(id) == owner
            && id.instance(game, None).unwrap().base() != &BaseCard::C20000
            && id != my_id
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                game.instantiate_and_summon(owner, BaseCard::C20000).await;
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
