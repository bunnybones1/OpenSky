use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Hex));

attachable_effect!(
  struct Hex;,
  HEX,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Sunset,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseEndTurn { player, .. }) = phase.try_into() {
            if player == game.owner(my_id) {
              let hex_id = my_id.instance(game, None).unwrap().attachment().unwrap();
              queue.add_resolution(move |game| {
                Box::pin(async move {
                  game.damage(my_id, 6, hex_id).await;
                  game.dust(hex_id).await;
                })
              });
            }
          }
        })
      }
    }
    .into()]
  }
);

#[test]
fn card_653() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_hp = game.hero(0).health;
      let hero = game.hero_id(0);
      game.give_spell(hero, enchant::HEX).await;
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).health, hero_hp - 6);
      assert!(game.hero(0).attachment().is_none());
    })
  })
}
