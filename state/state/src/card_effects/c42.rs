use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    game
      .modify_card(
        my_id,
        vec![
          Modifier::ModifyPower(1, None),
          Modifier::GrantTrait(Trait::Lifesteal),
          Modifier::GrantTrait(Trait::Wither),
        ],
      )
      .await;
  }))
  .into()],
  on_play: None
});
