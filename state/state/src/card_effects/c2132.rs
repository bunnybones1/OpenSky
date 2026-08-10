use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, owner| Box::pin(async move {
    game.kill(my_id).await;
    let units = game.all_units::<InstanceID>();
    game.damage_many(&units, 3, my_id).await;
    for _ in 0..3 {
      let blight = game.create_card(enemy(owner), BaseCard::C20064).await;
      game.move_to_zone(blight, Zone::Deck).await;
    }
  }))
  .into()],
  on_play: None
});
