use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let all_units = game.all_units();
        game.damage_many(&all_units, 2, my_id).await;
      })
    }
  }
});
