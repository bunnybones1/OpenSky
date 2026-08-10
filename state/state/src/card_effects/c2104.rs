use super::effect_helpers::*;

attachable_effect!(
  struct GenesisAvatar();,
  GENESISAVATAR,
  Effect::Unit {
    on_play: None,
    triggers: vec![]
  }
);

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    let player_already_used_genesis_effect = game
      .hero(owner)
      .effects
      .iter()
      .find_map(|m| match m {
        CardEffect::GenesisAvatar() => Some(true),
        _ => None,
      })
      .unwrap_or(false);
    if !player_already_used_genesis_effect && game.dust(my_id).await {
      for e in Element::iter() {
        let matching_elements = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.element == e);
        let most_expensive_matching_card = matching_elements
          .rev() // reverse, so 0 index in enumerate is bottom & max is top
          .enumerate()
          // sort by highest cost, then index,
          // so that we get the top highest cost card.
          .max_by_key(|(i, c)| (c.cost, *i))
          .map(|c| c.1.id());
        if let Some(most_expensive_matching_card) = most_expensive_matching_card {
          game
            .modify_card_single(most_expensive_matching_card, Modifier::ModifyCost(-2))
            .await;
          game
            .move_to_zone(most_expensive_matching_card, Zone::Deck)
            .await;
        }
      }
      game
        .add_modifier(
          hero,
          my_id,
          Modifier::GrantEffect(CardEffect::GenesisAvatar()),
          false,
          0,
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});

#[test]
fn test_genesis_avatar_only_once_per_game() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let genesis1 = game
        .instantiate_and_summon(0, BaseCard::C2104)
        .await
        .unwrap();
      game.resolve_triggers().await;
      let genesis2 = game
        .instantiate_and_summon(0, BaseCard::C2104)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let grave_card1 = game.instantiate_and_summon(0, BaseCard::C56).await.unwrap();
      game.move_to_zone(grave_card1, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let player_already_used_genesis_effect = game
        .hero(0)
        .effects
        .iter()
        .find_map(|m| match m {
          CardEffect::GenesisAvatar() => Some(true),
          _ => None,
        })
        .unwrap_or(false);
      assert!(!player_already_used_genesis_effect);

      assert_eq!(game.graveyard::<InstanceID>(0).len(), 1);

      game.kill(genesis1).await;
      game.resolve_triggers().await;

      let player_already_used_genesis_effect = game
        .hero(0)
        .effects
        .iter()
        .find_map(|m| match m {
          CardEffect::GenesisAvatar() => Some(true),
          _ => None,
        })
        .unwrap_or(false);
      assert!(player_already_used_genesis_effect);
      assert_eq!(game.graveyard::<InstanceID>(0).len(), 0);
      let grave_card2 = game.instantiate_and_summon(0, BaseCard::C56).await.unwrap();
      game.move_to_zone(grave_card2, Zone::Graveyard).await;
      game.resolve_triggers().await;

      game.kill(genesis2).await;
      game.resolve_triggers().await;

      let player_already_used_genesis_effect = game
        .hero(0)
        .effects
        .iter()
        .find_map(|m| match m {
          CardEffect::GenesisAvatar() => Some(true),
          _ => None,
        })
        .unwrap_or(false);
      assert!(player_already_used_genesis_effect);
      // expected 2 since genesis no longer dusts himself
      // if the effect has been used once this game
      assert_eq!(game.graveyard::<InstanceID>(0).len(), 2);
    })
  })
}
