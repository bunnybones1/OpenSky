use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let enemy_units = game.units(enemy(owner));
        game.give_spell_many(&enemy_units, enchant::FROSTBITE).await;
        let all_units = game.all_units();
        game.damage_many(&all_units, 1, my_id).await;
      })
    }
  }
});
