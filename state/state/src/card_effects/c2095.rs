use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let enemy_player = enemy(game.owner(my_id));

    let enemies_with_attachments: Vec<_> = game
      .characters::<&CardInstance<SkyWeaver>>(enemy_player)
      .into_iter()
      .filter(|c| c.attachment().is_some())
      .map(|c| c.id())
      .collect();
    game.damage_many(&enemies_with_attachments, 1, my_id).await;
  }))
  .into()],
  on_play: None
});
