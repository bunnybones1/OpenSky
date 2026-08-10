use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    for player in &[owner, 1 - owner] {
      for _ in 0..2 {
        let id = game.create_card(*player, BaseCard::C20029).await;
        game.move_to_zone(id, Zone::Hand { public: true }).await;
      }
    }
  }))
  .into()],
  on_play: None
});
