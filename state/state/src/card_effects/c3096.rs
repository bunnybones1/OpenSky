use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    for _ in 0..2 {
      let card = game.draw(owner, |c, _| c.is_spell()).await;
      if let Some(card) = card {
        game
          .modify_card(card, vec![Modifier::SetRarity(Rarity::Gold)])
          .await;
      }
    }
  }))
  .into()],
  on_play: None
});
