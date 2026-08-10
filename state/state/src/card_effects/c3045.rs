use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    for _ in 0..3 {
      game
        .instantiate_and_run_and_summon(owner, BaseCard::C20006, |game, card| {
          Box::pin(async move {
            game
              .modify_card(card, vec![Modifier::GrantTrait(Trait::Armor)])
              .await;
          })
        })
        .await;
    }
  }))
  .into()],
  on_play: None
});
