use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    game
      .modify_card(my_id, vec![Modifier::GrantTrait(Trait::Stealth)])
      .await;
  }))
  .into()],
  on_play: None
});
