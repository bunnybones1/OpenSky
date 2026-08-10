use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |_game, _my_id, _| {
      Box::pin(async move {
        panic!("This doesn't make any sense.");
      })
    },
  }
});
