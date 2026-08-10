use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let has_attach = game
      .reveal_from_card(my_id, |c| c.attachment().is_some())
      .await;
    if !has_attach {
      game.give_spell(my_id, enchant::CHAINS).await;
    }
  }))
  .into()],
  on_play: None
});
