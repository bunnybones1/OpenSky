use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_hero,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let drawn_card = game
          .draw_low_cost(owner, (owner, Zone::Hand { public: true }), |c, a| {
            c.is_unit() && a.map(|a| a.is_enchant()).unwrap_or(false)
          })
          .await;
        if let Some(drawn_card) = drawn_card {
          let attachment = game
            .reveal_from_card(drawn_card, |c| c.attachment().unwrap())
            .await;
          let units: Vec<_> = game.units(game.owner(target));

          for u in units {
            let a = game.copy_card(attachment, false).await;
            game.move_to_zone(a, Zone::Attachment { parent: u }).await;
          }
        }
      })
    },
  }
});
