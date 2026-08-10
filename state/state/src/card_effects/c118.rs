use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let highest_cost_dead_spell = game
        .graveyard::<&CardInstance<SkyWeaver>>(owner)
        .into_iter()
        .filter(|c| c.is_unit())
        .map(|c| c.base().instance().cost)
        .max_by_key(|cost| *cost)
        .unwrap_or(0.into());
      -i8::from(highest_cost_dead_spell)
    },
    AuraLayer::DecreaseCost
  ),
  on_play: None
});
