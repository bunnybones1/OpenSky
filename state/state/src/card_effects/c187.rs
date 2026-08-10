use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseModifyCard {
          card,
          modifier: Modifier::ModifyPower(amount, _),
          ..
        }) = phase.try_into()
        {
          let owner = game.owner(my_id);

          if game
            .reveal_from_card(card, move |c| {
              c.zone.is_field() && c.owner == owner && c.is_unit()
            })
            .await
            && amount > 0
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                if game
                  .reveal_from_card(card, |c| {
                    !(c.attachment.is_some() && c.attachment.unwrap().base() == &BaseCard::C20019)
                  })
                  .await
                {
                  game.give_spell(card, BaseCard::C20019).await;
                }
              })
            });
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});

#[test]
fn test_c187_hero_doesnt_get_shield_from_banner() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.instantiate_and_summon(0, BaseCard::C187).await;
      game.resolve_triggers().await;
      let hero = game.hero_id(0);
      assert!(
        game
          .reveal_from_card(hero, |c| c.attachment.is_none())
          .await
      );

      game
        .modify_card_single(hero, Modifier::GrantTrait(Trait::Banner))
        .await;
      game.resolve_triggers().await;
      assert!(
        game
          .reveal_from_card(hero, |c| c.attachment.is_none())
          .await
      );
    })
  })
}
