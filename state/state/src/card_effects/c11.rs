use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let damage = 4;
        let targets_to_damage = game.all_units();

        game.damage_many(&targets_to_damage, damage, my_id).await;
        let hero = game.hero_id(owner);
        game.give_spell(hero, BaseCard::C2006).await;
      })
    },
  }
});
