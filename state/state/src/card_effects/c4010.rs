use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mut cards = Vec::new();

        if let Some(first_unit) = game.draw(owner, |c, _| c.is_unit()).await {
          let first_element = game.reveal_from_card(first_unit, |c| c.element).await;
          cards.push(first_unit);

          if let Some(second_unit) = game
            .draw(owner, move |c, _| c.is_unit() && c.element != first_element)
            .await
          {
            let second_element = game.reveal_from_card(second_unit, |c| c.element).await;
            cards.push(second_unit);

            if let Some(third_unit) = game
              .draw(owner, move |c, _| {
                c.is_unit() && c.element != first_element && c.element != second_element
              })
              .await
            {
              cards.push(third_unit);
            }
          }
        }

        game.give_spell_many(&cards, BaseCard::C20022).await;
      })
    }
  }
});
