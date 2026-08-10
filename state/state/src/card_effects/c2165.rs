use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseModifyCard {
          card,
          modifier: Modifier::ModifyHealth(amount, _),
          ..
        }) = phase.try_into()
        {
          if game
            .reveal_from_card(card, move |c| c.zone.is_field() && c.id() == my_id)
            .await
            && amount < 0
          {
            let owner = game.owner(my_id);
            let curr_hp = game.reveal_from_card(my_id, |c| c.health).await;
            let delta: u8 = if amount.abs() > curr_hp.into() {
              curr_hp.into()
            } else {
              amount.abs() as u8
            };
            let enemy = game.lowest_health_character(enemy(owner), |_| true).await;
            if let Some(randomly_selected_enemy) = enemy {
              game.damage(randomly_selected_enemy, delta, my_id).await;
            }
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});
