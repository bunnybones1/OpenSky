use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_summon!(|game, my_id| Box::pin(async move {
      effect_1176(game, my_id).await;
    }))
    .into(),
    unit_death!(|game, my_id, _phase| Box::pin(async move {
      effect_1176(game, my_id).await;
    }))
    .into()
  ],
  on_play: None
});

async fn effect_1176(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let owner = game.owner(my_id);
  game.draw(owner, |c, _| c.cost == 1).await;
  game.draw(enemy(owner), |c, _| c.cost == 1).await;
}
