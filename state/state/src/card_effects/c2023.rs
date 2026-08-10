use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          if game.player_has_room_for_unit(owner) {
            let copy = game.copy_card(my_id, true).await;
            let (power, health) = game.reveal_from_card(copy, |c| (c.power, c.health)).await;
            game
              .modify_card(
                copy,
                vec![
                  Modifier::GrantTrait(Trait::Stealth),
                  Modifier::SetHealth(power),
                  Modifier::SetPower(health),
                ],
              )
              .await;
            game.summon(copy).await;
          }
        })
      },
    }
  }))
});
