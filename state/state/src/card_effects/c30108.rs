use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let targets_to_damage = game.player_cards(enemy(owner)).field().clone();
        game.damage_many(&targets_to_damage, 3, my_id).await;
      })
    }
  }
});
