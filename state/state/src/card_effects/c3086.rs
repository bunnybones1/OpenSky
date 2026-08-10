use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let each_character = game.all_characters();

        game.give_spell_many(&each_character, enchant::CHAINS).await;

        let each_unit = game.all_units();
        game.damage_many(&each_unit, 2, my_id).await;
      })
    },
  }
});
