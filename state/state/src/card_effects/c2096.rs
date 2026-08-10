use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    game.change_health(my_id, 1).await;
    let (power, health, has_guard_or_stealth) = game
      .reveal_from_card(my_id, |c| {
        (
          c.power,
          c.health,
          c.traits
            .iter()
            .find(|t| matches!(t, Trait::Guard | Trait::Stealth))
            .copied(),
        )
      })
      .await;
    let modifiers = {
      let mut modifiers = Vec::with_capacity(3);
      modifiers.push(Modifier::SetHealth(power));
      modifiers.push(Modifier::SetPower(health));
      match has_guard_or_stealth {
        Some(Trait::Guard) => modifiers.push(Modifier::GrantTrait(Trait::Stealth)),
        Some(Trait::Stealth) => modifiers.push(Modifier::GrantTrait(Trait::Guard)),
        _ => {}
      }
      modifiers
    };
    game.modify_card(my_id, modifiers).await;
  }))
  .into()],
  on_play: None
});
