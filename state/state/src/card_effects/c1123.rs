use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    game.damage(hero, 2, my_id).await;
    let card = game.create_card(owner, BaseCard::C20062).await;
    game.move_to_zone(card, Zone::Hand { public: true }).await;
  }))
  .into()],
  on_play: None
});
