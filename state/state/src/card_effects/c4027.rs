use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, phase| {
      Box::pin(async move {
        let ResolvedPhaseResolveCardEffect {
          played_mana_cost, ..
        } = phase;
        let owner = game.owner(my_id);
        if game.player_has_room_for_unit(owner) {
          game
            .draw_high_cost_x_or_less(
              owner,
              (owner, Zone::Field),
              u8::from(played_mana_cost),
              |_, _| true,
            )
            .await;
        }
      })
    }
  )
  .into()],
  on_play: None
});

#[test]
fn card_mootichi() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.player_mut(0).prisms.extend(vec![
        Prism::Agility,
        Prism::Heart,
        Prism::Intellect,
        Prism::Strength,
        Prism::Wisdom,
      ]);
      game.instantiate_and_summon(0, BaseCard::C4027).await;
      let mut expected_field_size = game.player_cards(0).field().len();

      for cost in 2..=5u8 {
        let c = game.fake_spell().await;
        game
          .modify_card(c, vec![Modifier::SetCost(cost.into())])
          .await;
        eprintln!("playing fake spell with cost {}", cost);
        game.move_to_zone(c, Zone::Casting).await;
        game
          .resolve_card_effect_as_player(c, None, cost.into())
          .await;
        game.resolve_triggers().await;
        assert!(game.player_cards(0).field().len() > expected_field_size);
        expected_field_size = game.player_cards(0).field().len();
      }
    })
  })
}
