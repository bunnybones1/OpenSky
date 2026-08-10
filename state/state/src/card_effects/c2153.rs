use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let amt = 2 + ((max_mana as f32 / 5.).floor()) as u8;

        game.damage(target, amt, my_id).await;
      })
    },
  }
});
