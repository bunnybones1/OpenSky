use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| Box::pin(async move {
        let spawn = game.instantiate_and_summon(owner, BaseCard::C138).await;
        if let Some(spawn) = spawn {
          game
            .modify_card_single(spawn, Modifier::ModifyPower(1, None))
            .await;
        }
      })
    }
  ))
});
