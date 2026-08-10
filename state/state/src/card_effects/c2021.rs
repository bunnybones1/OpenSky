use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game
          .give_hand_cards(
            owner,
            |c| c.is_unit(),
            vec![
              Modifier::ModifyPower(1, None),
              Modifier::ModifyHealth(1, None),
            ],
            my_id,
          )
          .await;
        game
          .give_hand_cards(
            owner,
            |c| c.is_spell(),
            vec![Modifier::ModifyCost(-1)],
            my_id,
          )
          .await;
        game.change_mana_next_turn(owner, 1, my_id).await;
      })
    },
  }
});
