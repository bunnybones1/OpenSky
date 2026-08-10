use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let player = game.owner(my_id);
    let top_deads: (Option<_>, Option<_>) = (
      game
        .graveyard::<&CardInstance<SkyWeaver>>(player)
        .into_iter()
        .find(|c| c.is_unit())
        .map(|c| c.id()),
      game
        .graveyard::<&CardInstance<SkyWeaver>>(enemy(player))
        .into_iter()
        .find(|c| c.is_unit())
        .map(|c| c.id()),
    );

    if let (Some(first), Some(second)) = top_deads {
      if game.dust(first).await && game.dust(second).await {
        game.change_health(my_id, 2).await;
      }
    }
  }))
  .into()],
  on_play: None
});
