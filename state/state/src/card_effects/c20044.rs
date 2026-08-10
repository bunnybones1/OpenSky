use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |_game, _, _owner| {
      Box::pin(async move {
        panic!("This space is intentionally left blank.");
      })
    },
  }
});
