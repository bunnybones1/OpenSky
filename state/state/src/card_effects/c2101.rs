use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let card = game.draw_any_card(owner).await;
        if let Some(drawn) = card {
          let copy = game.copy_card(drawn, true).await;
          game.move_to_zone(copy, Zone::Hand { public: false }).await;
        }
        if game.player(owner).mana == 0 {
          game.change_mana_next_turn(owner, 2, my_id).await;
        }
      })
    },
  }
});
