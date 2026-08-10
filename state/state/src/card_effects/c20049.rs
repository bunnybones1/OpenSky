use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Fate));

attachable_effect!(
  struct Fate;,
  FATE,
  Effect::Unit {
    on_play: None,
    triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
      let owner = game.owner(my_id);
      let my_element = game.reveal_from_card(my_id, |c| c.element).await;
      game.draw(owner, move |c, _| c.element == my_element).await;
    }))
    .into()],
  }
);

#[test]
fn card_1004() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.give_spell(unit, enchant::FATE).await;

      let hand_size = game.player_cards(0).hand().len();
      game.kill(unit).await;
      game.resolve_triggers().await;
      // fate should have fired
      assert_eq!(game.player_cards(0).hand().len(), hand_size + 1);
    })
  })
}
