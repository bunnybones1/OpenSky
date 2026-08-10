use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let spell = game.draw(owner, |c, _| c.is_spell() && c.cost >= 1).await;
        if let Some(spell) = spell {
          let cost = game.reveal_from_card(spell, |c| c.cost).await;

          game.draw_into_play(owner, move |c, _| c.cost == cost).await;
        }
      })
    },
  }
});
