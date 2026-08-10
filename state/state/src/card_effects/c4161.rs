use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _owner| {
      Box::pin(async move {
        let dmg = 3;

        let all_units = game.all_units();
        game.damage_many(&all_units, dmg as u8, my_id).await;
      })
    },
  }
});
