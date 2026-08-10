use super::effect_helpers::*;

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      let hero = game.hero_id(owner);
      Box::pin(async move {
        game
          .add_modifier(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::Faster()),
            false,
            0,
          )
          .await;
      })
    },
  }
});

attachable_effect!(
  struct Faster();,
  FASTER,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Continuous,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, _queue, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);
          if let Ok(ResolvedPhaseMoveToZone {
            card,
            to: (unit_owner, Zone::Field),
            from,
          }) = phase.try_into()
          {
            if !from.is_field() && unit_owner == owner {
              game
                .run_instant_trigger(BaseCard::C30103, my_id, EffectType::Generic, move |game| {
                  Box::pin(async move {
                    let id = game.reveal_from_card(card, |c| c.id()).await;
                    game.ready(id).await;
                  })
                })
                .await;
            }
          }
        })
      },
    }
    .into()]
  }
);
