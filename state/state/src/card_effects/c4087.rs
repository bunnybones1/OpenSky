use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let num_water_cards = game
        .graveyard::<&CardInstance<SkyWeaver>>(owner)
        .into_iter()
        .filter(|c| c.base().instance().element == Element::Water)
        .count();
      let modifier = if num_water_cards > std::i8::MAX as usize {
        std::i8::MAX
      } else {
        num_water_cards as i8
      };
      -modifier
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, _, c| c.instance(g, None).unwrap().is_unit(),
    mutate: |game, my_id, target, _| Box::pin(async move {
      game.give_spell(target, enchant::CHAINS).await;
      game.damage(target, 4, my_id).await;
    })
  },
});

#[test]
fn test_anchor_drop_updates_cost_in_hand() -> Result<(), String> {
  for public in &[true, false] {
    run_test(move |mut game| {
      Box::pin(async move {
        let blank_unit: BaseCard = BaseCard::iter()
          .find(|c| {
            c.instance().traits.is_empty()
              && c.intrinsic_effect().is_none()
              && c.attached_spell().is_none()
          })
          .expect("WTF? No cards have no keywords.");
        let unit = game.create_card(0, blank_unit).await;
        game
          .move_to_zone(unit, Zone::Hand { public: *public })
          .await;
        let anchor_drop = game.give_spell(unit, BaseCard::C4087).await.unwrap();
        game.resolve_triggers().await;
        assert_eq!(
          game.reveal_from_card(anchor_drop, |c| c.cost).await,
          BaseCard::C4087.instance().cost
        );

        // put a water card in the graveyard
        {
          let water_card: BaseCard = BaseCard::iter()
            .find(|c| c.instance().element == Element::Water && c.intrinsic_effect().is_none())
            .expect("WTF? No cards are water.");

          let water_card = game.create_card(0, water_card).await;
          game.move_to_zone(water_card, Zone::Graveyard).await;
        }
        game.resolve_triggers().await;

        assert_eq!(
          game.reveal_from_card(anchor_drop, |c| c.cost).await,
          BaseCard::C4087.instance().cost - 1,
          "Anchor Drop didn't change cost in {} hand!",
          if *public { "public" } else { "private" }
        );
      })
    })?
  }
  Ok(())
}
