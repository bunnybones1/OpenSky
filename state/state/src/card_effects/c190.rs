use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::GreenerPastures),
            0,
            1,
          )
          .await;
        game.instantiate_and_summon(owner, BaseCard::C20003).await;
      })
    },
  }
});

attachable_effect!(
  struct GreenerPastures;,
  GREENERPASTURES,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Generic,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseMoveToZone {
            card,
            to: (card_owner, Zone::Field),
            ..
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);
            if card_owner == owner {
              queue.add_alive_in_play_resolution(my_id, move |game| {
                Box::pin(async move {
                  game.berf(card, 1, 1).await;
                })
              });
            }
          }
        })
      },
    }
    .into()]
  }
);
