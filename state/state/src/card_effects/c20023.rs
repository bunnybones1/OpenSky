use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Flames));

attachable_effect!(
  struct Flames;,
  FLAMES,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Sunrise,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseStartTurn { player, .. }) = phase.try_into() {
            if player == game.owner(my_id) {
              let parent = my_id.instance(game, None);
              if let Some(parent) = parent {
                let attachment_id = parent.attachment();
                if let Some(flames_id) = attachment_id {
                  queue.add_resolution(move |game| {
                    Box::pin(async move {
                      game.damage(my_id, 2, flames_id).await;
                    })
                  });
                }
              }
            }
          }
        })
      }
    }
    .into()]
  }
);

#[test]
fn card_527() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero = game.hero_id(0);
      game.give_spell(hero, enchant::FLAMES).await;
      game.pass_turn().await;
      game.pass_turn().await;
      let hero_hp = game.hero(0).health;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).health, hero_hp - 2);
    })
  })
}
