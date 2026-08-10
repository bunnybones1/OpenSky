use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
    let is_enemy_turn = game.current_player != game.owner(my_id);
    game
      .grant_modifier_for_turns(
        enemy_hero,
        my_id,
        Modifier::GrantEffect(CardEffect::SonicJammer),
        0,
        if is_enemy_turn { 1 } else { 2 },
      )
      .await;
  }))
  .into()],
  on_play: None
});

attachable_effect!(
  struct SonicJammer;,
  SONIC_JAMMER,
  Effect::Unit {
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: |z, _| z.is_field(), // works while silenced.
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let owner = game.owner(my_id);
            game
              .aura_cards_have(
                owner,
                my_id,
                |c| c.is_spell() || c.is_enchant(),
                vec![Modifier::ModifyCost(1)],
                0,
              )
              .await;
          }
        })
      },
    }
    .into()],
    on_play: None
  }
);

#[test]
fn test_sonic_jammer() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let oppt_hand_spell = game.create_card(1, *tests::SPELL_CARD).await;
      game
        .move_to_zone(oppt_hand_spell, Zone::Hand { public: false })
        .await;
      let oppt_hand_spell_cost = game.reveal_from_card(oppt_hand_spell, |c| c.cost).await;
      let oppt_hero = game.hero_id(1);
      let oppt_attachment = game.give_spell(oppt_hero, enchant::ANIMA).await.unwrap();
      let oppt_attachment_cost = game.reveal_from_card(oppt_attachment, |c| c.cost).await;

      game.instantiate_and_summon(0, BaseCard::C108).await;
      game.resolve_triggers().await;

      // oppt cards get debuff right away
      assert_eq!(
        game.reveal_from_card(oppt_hand_spell, |c| c.cost).await,
        oppt_hand_spell_cost + 1
      );
      assert_eq!(
        game.reveal_from_card(oppt_attachment, |c| c.cost).await,
        oppt_attachment_cost + 1
      );

      game.pass_turn().await;
      game.resolve_triggers().await;
      // oppt cards get debuff on oppt's turn
      assert_eq!(
        game.reveal_from_card(oppt_hand_spell, |c| c.cost).await,
        oppt_hand_spell_cost + 1
      );
      assert_eq!(
        game.reveal_from_card(oppt_attachment, |c| c.cost).await,
        oppt_attachment_cost + 1
      );
      game.pass_turn().await;
      game.resolve_triggers().await;
      // oppt cards aren't debuffed once it gets back to your turn
      assert_eq!(
        game.reveal_from_card(oppt_hand_spell, |c| c.cost).await,
        oppt_hand_spell_cost
      );
      assert_eq!(
        game.reveal_from_card(oppt_attachment, |c| c.cost).await,
        oppt_attachment_cost
      );
    })
  })
}
