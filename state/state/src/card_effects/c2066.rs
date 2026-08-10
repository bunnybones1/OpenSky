use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mut dusted_elements: IndexSet<_> = IndexSet::new();

        for _ in 0..3 {
          let my_top_grave_card = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .next()
            .map(|c| (c.base().instance().element, c.id()));
          if let Some((element, id)) = my_top_grave_card {
            game.dust(id).await;
            dusted_elements.insert(element);
          }
        }

        for elem in dusted_elements {
          game.draw(owner, move |c, _| c.element == elem).await;
        }
      })
    },
  }
});
