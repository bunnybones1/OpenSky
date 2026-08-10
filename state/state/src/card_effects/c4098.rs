use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, owner| Box::pin(async move {
    let ally_units = game
      .units(owner)
      .into_iter()
      .filter(|id| *id != my_id)
      .collect();

    let target = game
      .get_attach_smart_random(enchant::FURY, ally_units)
      .await;
    if let Some(target) = target {
      game.change_power(target, 1).await;
      game.give_spell(target, enchant::FURY).await;
    }
  }))
  .into()],
  on_play: None
});

#[test]
fn test_jackrabbit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let songbird = game
        .instantiate_and_run_and_summon(0, BaseCard::C20000, |game, id| {
          Box::pin(async move {
            game.give_spell(id, enchant::LEAD).await; // give lead
          })
        })
        .await
        .unwrap(); // songbird

      let dust_size = game.player_cards(0).dust().len();

      game.instantiate_and_summon(0, BaseCard::C4098).await; // summon this
      game.resolve_triggers().await;
      game.pass_turn().await;
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(
        game
          .reveal_from_card(songbird, |c| *c.attachment.unwrap().base())
          .await,
        enchant::LEAD,
        "jackrabbit doesn't have lead!"
      );
      let new_dust_size = game.player_cards(0).dust().len();
      assert_eq!(
        dust_size + 1,
        new_dust_size,
        "Didn't create and dust the attach!"
      );
    })
  })
}
