use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let units_to_freeze = game.all_units();
        game
          .give_spell_many(&units_to_freeze, enchant::FROSTBITE)
          .await;
      })
    },
  }
});
