use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let ally_units = game.units(owner);
        for ally in &ally_units {
          game.change_power(*ally, 1).await;
        }
        game.give_spell_many(&ally_units, enchant::FURY).await;
      })
    },
  }
});
