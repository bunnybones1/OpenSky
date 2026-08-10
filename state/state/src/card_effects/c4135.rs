use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let dmg = 3
          + game
            .player(owner)
            .this_turn_stats
            .base_cards_played
            .iter()
            .map(|c| c.instance())
            .filter(|c| c.is_spell() && c.element == Element::Water)
            .count();
        let enemies = game.enemy_field(owner);
        game.damage_many(&enemies, dmg as u8, my_id).await;
      })
    },
  }
});
