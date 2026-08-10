use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let hero = game.hero_id(game.owner(my_id));

    let mut rng = game.context().random().await;
    let random_blade = BLADES.iter().choose(&mut rng).unwrap();

    game.give_spell(hero, *random_blade).await;
  }))
  .into()],
  on_play: None
});
