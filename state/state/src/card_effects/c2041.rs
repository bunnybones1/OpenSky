use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);

    let mut rng = game.context().random().await;
    let random_blade = BLADES.iter().choose(&mut rng).unwrap();

    game.add_to_hand(owner, *random_blade).await;
  }))
  .into()],
  on_play: None
});
