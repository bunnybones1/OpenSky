use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        for e in Element::iter() {
          let conjure_card_of_element_phase = game
            .run(PhaseConjure {
              from: owner,
              to: (owner, Zone::Deck),
              predicate: Some(std::rc::Rc::new(move |c, _| c.element == e)),
            })
            .await;

          if let Ok(ResolvedPhaseConjure {
            from: _,
            to: _,
            conjured_card,
          }) = conjure_card_of_element_phase.try_into()
          {
            game.context().mutate_secret(owner, |secret| {
              let is_spell = secret
                .instance(conjured_card)
                .expect("conjured cards are secret")
                .is_spell();
              if is_spell {
                secret
                  .secret
                  .apply_modifier(conjured_card, Modifier::ModifyCost(-1), my_id, secret.log)
                  .unwrap();
              } else {
                secret
                  .secret
                  .apply_modifier(
                    conjured_card,
                    Modifier::ModifyPower(2, None),
                    my_id,
                    secret.log,
                  )
                  .unwrap();
                secret
                  .secret
                  .apply_modifier(
                    conjured_card,
                    Modifier::ModifyHealth(1, None),
                    my_id,
                    secret.log,
                  )
                  .unwrap();
              }
            });
          }
        }
        game.draw_any_card(owner).await;
      })
    },
  }
});
