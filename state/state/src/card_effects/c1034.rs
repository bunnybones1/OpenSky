use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);

    let card = game.create_card(owner, BaseCard::C1075).await;
    game.move_to_zone(card, Zone::Casting).await;
    game.cleanup_dead_units().await;
    game
      .cast_spell_on_enemies(card, |c| c.is_unit(), true, true)
      .await;
  }))
  .into()],
  on_play: None
});
