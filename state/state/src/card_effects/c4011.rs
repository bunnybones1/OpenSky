use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let element = game.reveal_from_card(target, |c| c.element).await;
        game.dust(target).await;
        let hero = game.hero_id(owner);
        game
          .run(PhaseConjure {
            from: owner,
            to: (
              owner,
              Zone::Attachment {
                parent: hero.into(),
              },
            ),
            predicate: Some(std::rc::Rc::new(move |c, _| c.element == element)),
          })
          .await;
      })
    },
  }
});
