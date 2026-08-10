use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::ModifyPower(1, None),
              Modifier::ModifyHealth(1, None),
            ],
          )
          .await;
        let target_element = game.reveal_from_card(target, |c| c.element).await;
        let filter = move |c: &CardInstance<SkyWeaver>| c.is_unit() && c.element == target_element;
        let modifiers = vec![
          Modifier::ModifyPower(1, None),
          Modifier::ModifyHealth(1, None),
        ];
        game
          .give_hand_cards(owner, filter, modifiers.clone(), my_id)
          .await;
        game
          .give_deck_cards(owner, filter, modifiers.clone(), my_id)
          .await;
      })
    },
  }
});
