use super::effect_helpers::*;
intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let top_dead_1c_base = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .find(|c| c.base().instance().cost == 1)
      .map(|c| (*c.base(), c.is_spell()));
    // card doesn't say "base copy", but that's ok since cards in grave are always base.
    if let Some((top_dead_1c_base, is_spell)) = top_dead_1c_base {
      let id = game.create_card(owner, top_dead_1c_base).await;
      game.move_to_zone(id, Zone::Hand { public: true }).await;
      if is_spell {
        game.modify_card(id, vec![Modifier::ModifyCost(-1)]).await;
      }
    }
  }))
  .into()],
  on_play: None
});
