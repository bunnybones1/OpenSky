use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let mut ids: Vec<Card> = Vec::new();
        for _ in 0..2 {
          if let Some(id) = game
            .draw(owner, |c, _| c.element == Element::Earth && c.is_unit())
            .await
          {
            ids.push(id);
          }
        }
        for id in ids {
          game.berf(id, 1, 1).await;
        }
      })
    },
  }
});
