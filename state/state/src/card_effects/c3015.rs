use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    undragon_effect(game, my_id).await;
  }))
  .into(),],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, _owner| {
        Box::pin(async move {
          undragon_effect(game, my_id).await;
        })
      },
    }
  }))
});

async fn undragon_effect(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let owner = game.owner(my_id);
  for _ in 0..4u8 {
    game
      .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, card| {
        Box::pin(async move {
          game
            .modify_card(card, vec![Modifier::GrantTrait(Trait::Guard)])
            .await;
        })
      })
      .await;
  }
}
