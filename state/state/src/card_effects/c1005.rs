use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mut cards = vec![];
        cards.push(game.draw(owner, |c, _| c.is_unit() && c.cost == 1).await);
        cards.push(game.draw(owner, |c, _| c.is_unit() && c.cost == 2).await);
        cards.push(game.draw(owner, |c, _| c.is_unit() && c.cost == 3).await);
        let drawn_cards: Vec<_> = cards.into_iter().flatten().collect();
        game.give_spell_many(&drawn_cards, enchant::ANIMA).await;
      })
    },
  }
});
