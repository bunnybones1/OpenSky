use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let id = game.draw_into_play(owner, |c, _| c.cost == 2).await;
        if let Some(id) = id {
          if game.reveal_from_card(id, |c| c.attachment.is_none()).await {
            game.give_spell(id, enchant::BARRIER).await;
          }
        }
      })
    },
  }
});
