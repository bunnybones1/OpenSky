use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Lead));

attachable_effect!(
  struct Lead;,
  LEAD,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Continuous,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        let my_attach = my_id.instance(game, None).unwrap().attachment();
        if let Ok(PhaseMoveToZone { card, zone, player }) = <&_>::try_from(phase) {
          if card.id() == my_attach || (card.id() == Some(my_id) && zone.is_public_dust()) {
            return Some(PhaseCancelled.into());
          }
          if let Zone::Attachment { parent } = zone {
            if parent.id() == Some(my_id) {
              // If something is trying to attach itself over me,
              // Dust it instead!
              return Some(
                PhaseMoveToZone {
                  card: *card,
                  zone: Zone::Dust { public: true },
                  player: *player,
                }
                .into(),
              );
            }
          }
        }
        None
      }),
    }
    .into()]
  }
);

#[test]
fn card_988_prevents_itself_dusting() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_id = game.hero_id(0);
      game.give_spell(hero_id, enchant::LEAD).await;
      game.give_spell(hero_id, BaseCard::Dummy).await;
      assert_eq!(
        *game
          .hero(0)
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        enchant::LEAD
      );
    })
  })
}
#[test]
fn card_988_prevents_its_host_dusting() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_id = game.hero_id(0);
      game.give_spell(hero_id, enchant::LEAD).await;
      game.give_spell(hero_id, BaseCard::Dummy).await;
      assert_eq!(
        *game
          .hero(0)
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        enchant::LEAD
      );
    })
  })
}

#[test]
fn lead_blocks_manual_attach() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let hero_id = game.hero_id(0);
      game.give_spell(hero_id, enchant::LEAD).await;

      let card = game.create_card(0, BaseCard::Dummy).await;

      game.context.enable_logs(true);
      game
        .move_to_zone(
          card,
          Zone::Attachment {
            parent: hero_id.into(),
          },
        )
        .await;

      assert_eq!(
        *game
          .hero(0)
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        enchant::LEAD
      );
    })
  })
}
