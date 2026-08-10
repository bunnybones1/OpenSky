use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    if let Some(max_cost) = game
      .high_cost_in_pool(
        owner,
        |c, _| c.is_unit(),
        CardPool::Anywhere,
        Zone::Hand { public: false },
      )
      .await
    {
      game
        .draw(owner, move |c, _| c.cost == max_cost && c.is_unit())
        .await;
    }
  }))
  .into()],
  on_play: None
});
