use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    game
      .modify_card(
        my_id,
        vec![
          Modifier::GrantTrait(Trait::Guard),
          Modifier::GrantTrait(Trait::Banner),
        ],
      )
      .await;
  }))
  .into()],
  on_play: None
});
