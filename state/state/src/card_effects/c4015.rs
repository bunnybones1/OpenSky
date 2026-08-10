use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let top_dead_spell = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .find(|c| c.is_spell() && c.base().instance().cost >= 1)
      .map(|c| c.id());
    if let Some(spell) = top_dead_spell {
      game.move_to_zone(spell, Zone::Hand { public: true }).await;
    }
  }))
  .into()],
  on_play: None
});
