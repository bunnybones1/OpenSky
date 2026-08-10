use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseModifyCard {
          card,
          modifier: Modifier::ModifyPower(amount, _),
          ..
        }) = phase.try_into()
        {
          if game
            .reveal_from_card(card, |c| {
              c.effects
                .iter()
                .find(|m| **m == CardEffect::SavageSquirrel)
                .is_some()
            })
            .await
          {
            return;
          }
          if game
            .reveal_from_card(card, move |c| c.zone.is_field() && c.id() == my_id)
            .await
            && amount > 0
          {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                let owner = game.owner(my_id);
                let units = game
                  .units(owner)
                  .iter()
                  .filter(|u| u != &&my_id)
                  .cloned()
                  .collect();
                game
                  .smart_random_modify(vec![Modifier::ModifyPower(amount, None)], units)
                  .await;
              })
            });
            game
              .grant_modifier_for_turns(
                card,
                my_id,
                Modifier::GrantEffect(CardEffect::SavageSquirrel),
                0,
                1,
              )
              .await;
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});

attachable_effect!(
  struct SavageSquirrel;,
  SAVAGESQUIRREL,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![]
  }
);
