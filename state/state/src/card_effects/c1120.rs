use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    for p in 0..2u8 {
      let hero = game.hero_id(p);
      game.damage(hero, 3, my_id).await;
    }
  }))
  .into()],
  on_play: None
});
