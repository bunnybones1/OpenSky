use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let draw_amt = ((max_mana as f32 / 5.).floor() + 1.) as i8;
        for _ in 0..draw_amt {
          game.draw_any_card(owner).await;
        }
      })
    },
  }
});
