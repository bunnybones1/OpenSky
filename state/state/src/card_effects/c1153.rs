use std::iter;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: iter::once(
    unit_aura!(
      |game, my_id| Box::pin(async move {
        let my_owner = game.owner(my_id);
        let my_hero = game.hero_id(my_owner);
        game
          .add_aura_modifier(my_hero, my_id, Modifier::ModifyPower(5, None), 0)
          .await;
      }),
      AuraLayer::FieldKeyword
    )
    .into()
  )
  .chain(
    xcost_modify!(
      |game, my_id| {
        let owner = game.owner(my_id);
        let hero = game.hero(owner);
        let hero_power: i8 = if hero.power > 5 { 5 } else { hero.power.into() } as i8;
        -hero_power
      },
      AuraLayer::DecreaseCost
    )
    .into_iter()
  )
  .collect(),
  on_play: None
});
