use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let element = target.instance(game, None).unwrap().element;

        let drawn_unit = game
          .draw(owner, move |c, _| c.element == element && c.is_unit())
          .await;

        let num_cards_in_hand_of_element = (game
          .player_cards(owner)
          .hand()
          .iter()
          .flatten()
          .filter(|c| c.instance(game, None).unwrap().element == element)
          .count()
          + game
            .context
            .reveal_unique(
              owner,
              move |secret| {
                secret
                  .hand()
                  .iter()
                  .flatten()
                  .filter(|c| secret.instance(*c).unwrap().element == element)
                  .count()
              },
              |_| true,
            )
            .await) as i8;

        game
          .modify_card(
            target,
            vec![
              Modifier::ModifyPower(num_cards_in_hand_of_element, None),
              Modifier::ModifyHealth(num_cards_in_hand_of_element, None),
            ],
          )
          .await;
        if let Some(drawn_unit) = drawn_unit {
          game
            .modify_card(
              drawn_unit,
              vec![
                Modifier::ModifyPower(num_cards_in_hand_of_element, None),
                Modifier::ModifyHealth(num_cards_in_hand_of_element, None),
              ],
            )
            .await;
        }
      })
    },
  }
});
