use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let all_units = game.enemy_units(owner);
        let max_mana: u32 = game.player(owner).max_mana.into();
        let amt = (max_mana as f32 / 5.).floor() + 1.;

        game.damage_many(&all_units, amt as u8, my_id).await;
      })
    }
  }
});
