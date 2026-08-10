use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, target| Box::pin(async move {
    if game.reveal_from_card(target, |c| !c.is_hero()).await {
      let owner = game.owner(my_id);
      let base = game.reveal_from_card(target, |c| *c.instance.base()).await;
      let copy = game.create_card(owner, base).await;
      game.move_to_zone(copy, Zone::Hand { public: true }).await;
    }
  }))
  .into()],
  on_play: None
});
