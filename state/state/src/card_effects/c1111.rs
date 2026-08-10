use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let power_gain: i8 = game
      .player(game.owner(my_id))
      .this_turn_stats
      .hero_hp_lost
      .try_into()
      .unwrap_or(std::i8::MAX);
    game
      .modify_card(
        my_id,
        vec![
          Modifier::GrantTrait(Trait::Guard),
          Modifier::ModifyPower(power_gain, None),
        ],
      )
      .await;
  }))
  .into()],
  on_play: None
});
