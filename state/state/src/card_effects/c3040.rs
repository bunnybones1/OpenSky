use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Light,
    |game, my_id, _phase| Box::pin(async move {
      game
        .modify_card(my_id, vec![Modifier::GrantTrait(Trait::Guard)])
        .await;
      game.give_spell(my_id, enchant::SHIELD).await;
    })
  )
  .into()],
  on_play: None
});
