use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let num_1c_cards = game
        .graveyard::<&CardInstance<SkyWeaver>>(owner)
        .into_iter()
        .filter(|c| c.base().instance().cost == 1)
        .count();
      let modifier = if num_1c_cards > std::i8::MAX as usize {
        std::i8::MAX
      } else {
        num_1c_cards as i8
      };
      -modifier
    },
    AuraLayer::DecreaseCost
  ),
  on_play: None
});
