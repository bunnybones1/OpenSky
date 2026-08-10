use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let dead_shrooms = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .iter()
      .filter(|c| is_shroom(c.base()))
      .map(|c| *c.base())
      .collect_vec();
    for shroom in dead_shrooms {
      let copy = game.create_card(owner, shroom).await;
      game.move_to_zone(copy, Zone::Deck).await;
    }
    game.draw(owner, move |c, _| is_shroom(&c.base)).await;
  }))
  .into()],
  on_play: None
});
