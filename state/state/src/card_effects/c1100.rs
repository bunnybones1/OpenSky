use crate::card::ModifyHealthReason;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if game.current_player != owner {
        return None;
      }
      if let Ok(&PhaseModifyCard {
        card,
        modifier: Modifier::ModifyHealth(health, reason),
        source,
      }) = phase.try_into()
      {
        let is_damage = matches!(reason, Some(ModifyHealthReason::Damage(..)));
        if card.id() == Some(game.hero_id(owner)) && health < 0 && is_damage {
          return Some(
            PhaseModifyCard {
              card,
              modifier: Modifier::ModifyHealth(0, reason),
              source,
            }
            .into(),
          );
        }
      }
      None
    }),
  }
  .into()],
  on_play: None
});

#[test]
fn krakus_disciple_interaction() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game
        .instantiate_and_summon(0, BaseCard::C4068)
        .await
        .unwrap(); // krakus
      let spell = game.create_card(0, BaseCard::C20017).await;
      game.move_to_zone(spell, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(spell, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(spell, None, 0.into())
        .await;
      game.move_to_zone(spell, Zone::Graveyard).await;
      game.resolve_triggers().await;

      game.change_mana(0, -100).await;

      game
        .instantiate_and_summon(1, BaseCard::C1100)
        .await
        .unwrap(); // disciple

      game.resolve_triggers().await;

      let hero_hp = game.hero(1).health;

      game.pass_turn().await;
      assert!(
        game.hero(1).health < hero_hp,
        "disciple prevented p1 damage during p0's sunset"
      );
    })
  })
}
