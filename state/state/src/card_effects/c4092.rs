use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player_has_room_for_unit(owner) {
      let id = game
        .draw_low_cost(owner, (owner, Zone::Limbo { public: true }), |c, _| {
          c.is_unit() && c.cost == 1
        })
        .await;
      if let Some(id) = id {
        // as ...
        game
          .modify_card(id, vec![Modifier::GrantTrait(Trait::Dash)])
          .await;
        // into play...
        game.summon(id).await;
      }
    }
  }))
  .into()],
  on_play: None
});
