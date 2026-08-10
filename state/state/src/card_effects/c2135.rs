use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let all_units = game.all_units();
        game.damage_many(&all_units, 3, my_id).await;
        game.change_max_mana(owner, 1).await;
      })
    }
  }
});
