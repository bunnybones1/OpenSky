use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let conjured = game.create_card(owner, BaseCard::C20040).await;
    game
      .move_to_zone(conjured, Zone::Hand { public: true })
      .await;
  }))
  .into()],
  on_play: None
});
