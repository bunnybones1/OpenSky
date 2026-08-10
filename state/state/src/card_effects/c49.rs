use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let id = game.draw_into_play(owner, |c, _| c.cost == 1).await;
        if let Some(card) = id {
          game
            .modify_card(
              card,
              vec![
                Modifier::ModifyPower(2, None),
                Modifier::ModifyHealth(2, None),
                Modifier::GrantTrait(Trait::Guard),
              ],
            )
            .await;
          game.give_spell(card, enchant::ANIMA).await;
        }
      })
    },
  }
});
