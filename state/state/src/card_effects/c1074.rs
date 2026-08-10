use super::effect_helpers::*;

fn update_leo_effect(game: &mut LiveGame<'_>, owner: Player) {
  let leo_is_on_field = game
    .units::<&CardInstance<SkyWeaver>>(owner)
    .into_iter()
    .any(|c| *c.base() == BaseCard::C1074);
  game.player_mut(owner).banner_size = if leo_is_on_field { 2 } else { 1 };
}

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      update_leo_effect(game, owner);
    }),
    AuraLayer::Internal
  )
  .into()],
  on_play: None
});

#[test]
fn card_1074() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let leo = BaseCard::C1074;

      assert_eq!(game.hero(0).power, 1);

      let banner_unit = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(banner_unit, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;

      game.summon(banner_unit).await;
      assert!(game.is_alive_on_field(banner_unit));
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 2);

      let leo_unit = game.create_card(0, leo).await;
      game.summon(leo_unit).await;

      game.resolve_triggers().await;

      // 1 base power
      // +1 from banner unit
      // +1 from leo banner
      // +1 +1 from leo effect
      assert_eq!(game.hero(0).power, 5);

      let banner_spell = game.fake_spell().await;

      game
        .modify_card(banner_spell, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game
        .resolve_card_effect_as_player(banner_spell, None, 0.into())
        .await;
      game.resolve_triggers().await;
      // +1 from banner spell, +1 from leo effect.
      assert_eq!(game.hero(0).power, 7);
    })
  })
}

#[test]
fn card_1074_doesnt_stack() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let leo = BaseCard::C1074;

      assert_eq!(game.hero(0).power, 1);

      let leo_unit = game.create_card(0, leo).await;
      game.summon(leo_unit).await;

      game.resolve_triggers().await;

      // 1 base power
      // +1 from leo banner
      // +1 from leo effect
      assert_eq!(game.hero(0).power, 3);

      let leo_unit = game.create_card(0, leo).await;
      game.summon(leo_unit).await;

      game.resolve_triggers().await;
      // 1 base power
      // +2 from both leo banner
      // +2 from single leo effect
      assert_eq!(game.hero(0).power, 5);
    })
  })
}

#[test]
fn card_1074_can_be_silenced() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let leo = BaseCard::C1074;

      assert_eq!(game.hero(0).power, 1);

      let leo_unit = game.create_card(0, leo).await;
      game.summon(leo_unit).await;

      game.resolve_triggers().await;

      // 1 base power
      // +1 from leo banner
      // +1 from leo effect
      assert_eq!(game.hero(0).power, 3);

      // Silence leo
      game.give_spell(leo_unit, enchant::SILENCE).await;
      game.resolve_triggers().await;

      assert_eq!(game.hero(0).power, 2);
    })
  })
}
