use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let id = game.create_card(owner, BaseCard::C20000).await;
    game.move_to_zone(id, Zone::Hand { public: true }).await;
  }))
  .into()],
  on_play: None
});
