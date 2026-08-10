use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let curr_hp = game.reveal_from_card(my_id, |c| c.health).await;
    game
      .instantiate_and_run_and_summon(owner, BaseCard::C20003, |game, my_id| {
        Box::pin(async move {
          game
            .modify_card(
              my_id,
              vec![
                Modifier::SetHealth(curr_hp.into()),
                Modifier::SetPower(curr_hp.into()),
              ],
            )
            .await;
        })
      })
      .await;
  }))
  .into()],
  on_play: None
});
