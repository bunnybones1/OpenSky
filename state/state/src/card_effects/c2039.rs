use super::effect_helpers::*;

// Niko's effect is hard-coded in `live_game.rs#start_game`
intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: None
});
