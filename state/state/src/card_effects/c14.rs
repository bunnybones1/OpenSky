use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let damage = game.player_cards(enemy(owner)).hand().len() as u8;
        game.damage(target, damage, my_id).await;
      })
    },
  }
});
