use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    game
      .draw_low_cost_spell_onto(hero, |c, _| c.element == Element::Dark)
      .await;
    let enemy_hero = game.hero_id(enemy(owner));
    game
      .draw_low_cost_spell_onto(enemy_hero, |c, _| c.element == Element::Dark)
      .await;
  }))
  .into()],
  on_play: None
});
