use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let drawn_card = game
          .draw(owner, |c, attach| {
            c.is_unit() && attach.map_or(false, |a| a.is_spell())
          })
          .await;
        if let Some(drawn_card) = drawn_card {
          let attached_id = game
            .reveal_from_card(drawn_card, |c| c.attachment.map(|a| a.id()))
            .await;
          if let Some(attached_id) = attached_id {
            game
              .move_to_zone(attached_id, Zone::Hand { public: false })
              .await;
          }
        }
      })
    },
  }
});
