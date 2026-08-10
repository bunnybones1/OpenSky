use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Fury));

attachable_effect!(
  struct Fury;,
  FURY,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Glory,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, queue, parent_unit_id, phase, _| {
        Box::pin(async move {
          if let Ok(glory) = phase.try_into() {
            let ResolvedPhaseGlory(attacker_id, ..) = glory;
            let owner = game.owner(parent_unit_id);
            if attacker_id == parent_unit_id {
              let quest_id = game
                .reveal_from_card(parent_unit_id, |c| c.attachment.map(|c| c.id()))
                .await;

              for _ in 0..game.player(owner).glory_repeat {
                queue.add_resolution(move |game| {
                  Box::pin(async move {
                    game.draw(owner, |c, _| c.cost == 1).await;
                    game.berf(parent_unit_id, 1, 1).await;
                    if let Some(quest_id) = quest_id {
                      game.dust(quest_id).await;
                    }
                  })
                })
              }
            }
          }
        })
      },
    }
    .into()]
  }
);

#[test]
fn card_1018() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      game.give_spell(p1_hero, enchant::FURY).await;

      let hand_size = game.player_cards(0).hand().len();
      game
        .run(PhaseAttack {
          attacker: p1_hero,
          defender: p2_hero,
        })
        .await;
      game.resolve_triggers().await;

      assert_eq!(game.player_cards(0).hand().len(), hand_size + 1);
    })
  })
}
