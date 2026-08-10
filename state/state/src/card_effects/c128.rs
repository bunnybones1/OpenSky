use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let control_no_other_units = game.field_cards(owner).len() == 1;
        for i in 0..3u8 {
          let summoned_unit = game
            .draw_into_play(owner, move |card, _| card.cost == i + 1)
            .await;
          if let Some(unit) = summoned_unit {
            if control_no_other_units {
              game
                .modify_card_single(unit, Modifier::ModifyPower(1, None))
                .await;
              game
                .modify_card_single(unit, Modifier::GrantTrait(Trait::Guard))
                .await;
            }
          }
        }
      })
    },
  }
});
