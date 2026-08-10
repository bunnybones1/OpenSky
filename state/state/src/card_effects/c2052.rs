use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.conjure(owner, |c, _| c.is_spell()).await;
        game
          .give_hand_cards(
            owner,
            |c| c.is_spell(),
            vec![Modifier::GrantTrait(Trait::Banner)],
            my_id,
          )
          .await;
      })
    },
  }
});
