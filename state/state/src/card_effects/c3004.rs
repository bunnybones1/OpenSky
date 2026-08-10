use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    game.give_spell(hero, BaseCard::C3022).await;
  }))
  .into()],
  on_play: None
});
