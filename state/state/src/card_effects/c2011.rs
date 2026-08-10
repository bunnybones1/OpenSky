use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, player, _, c| {
      g.owner(c) == player && c.instance(g, None).unwrap().element == Element::Light
    },
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        if game.dust(target).await {
          let non_light_elements: [Element; 7] = [
            Element::Air,
            Element::Dark,
            Element::Earth,
            Element::Fire,
            Element::Metal,
            Element::Mind,
            Element::Water,
          ];

          for element in &non_light_elements {
            let element = *element;
            let card = game
              .conjure(owner, move |c, _| c.is_spell() && c.element == element)
              .await;

            if let Some(card) = card {
              game
                .modify_card(card, vec![Modifier::SetCost(1.into())])
                .await;
            }
          }
          game.dust(my_id).await;
        }
      })
    },
  }
});
