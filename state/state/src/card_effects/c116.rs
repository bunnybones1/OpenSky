use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let unit = game.draw_into_play(owner, |_, _| true).await;
        if let Some(unit) = unit {
          let (pwr, id) = game.reveal_from_card(unit, |c| (c.power, c.id())).await;
          let enemy_units = game
            .units::<InstanceID>(enemy(owner))
            .iter()
            .filter(|c| c != &&id)
            .cloned()
            .collect::<Vec<_>>();
          game.damage_many(&enemy_units, pwr.into(), my_id).await;
        }
      })
    },
  }
});
