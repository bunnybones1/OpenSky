use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let num_triggers = (max_mana as f32 / 5.).floor();
        let dmg = 2 + num_triggers as u8;
        let enemies = game.enemy_field(owner);

        game.damage_many(&enemies, dmg, my_id).await;
      })
    },
  }
});
