use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mana = game.players[owner as usize].mana;
        game.draw(owner, move |c, _| c.cost == mana).await;
      })
    },
  }
});
