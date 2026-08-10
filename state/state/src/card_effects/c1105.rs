use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game
          .modify_card_single(target, Modifier::GrantTrait(Trait::Banner))
          .await;
        let element = target.instance(game, None).unwrap().element;
        game
          .give_hand_cards(
            owner,
            |c| c.element == element,
            vec![Modifier::GrantTrait(Trait::Banner)],
            my_id,
          )
          .await;
        game
          .give_deck_cards(
            owner,
            |c| c.element == element,
            vec![Modifier::GrantTrait(Trait::Banner)],
            my_id,
          )
          .await;
      })
    },
  }
});
