use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let units_played_this_turn: Vec<Card> = game
      .player(owner)
      .this_turn_stats
      .units_summoned
      .iter()
      .copied()
      .map_into()
      .collect();
    let summoned_another_metal_unit_this_turn = game
      .reveal_from_cards_fold(
        units_played_this_turn,
        move |c| c.element == Element::Metal && c.id() != my_id,
        false,
        |did, this_did| did || *this_did,
      )
      .await;
    if summoned_another_metal_unit_this_turn {
      let hero_id = game.hero_id(owner);
      game.give_spell(hero_id, BaseCard::C20017).await;
    }
  }))
  .into()],
  on_play: None
});
