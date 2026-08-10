use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let summoned = game.draw_into_play(owner, |card, _| card.cost == 3).await;
    if let Some(card) = summoned {
      game.give_spell(card, enchant::ANIMA).await;
    }
  }))
  .into()],
  on_play: None
});
