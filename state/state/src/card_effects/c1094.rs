use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let top_two_dead: Vec<_> = game.graveyard(enemy(owner)).into_iter().take(2).collect();
    game.dust_many(top_two_dead).await;
  }))
  .into()],
  on_play: None
});
