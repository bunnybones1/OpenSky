use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let grave_cards = game
          .player_cards(owner)
          .graveyard()
          .iter()
          .map(Card::from)
          .rev()
          .collect();
        let top_dead_spells = game.filter_cards(grave_cards, |c| c.is_spell()).await;
        let top_three_spells = top_dead_spells.iter().take(2).collect_vec();
        for spell in top_three_spells {
          game
            .cast_spell_on_enemies(spell.id().unwrap(), |_| true, false, false)
            .await;
          game.dust(spell).await;
          game.cleanup_dead_units().await;
        }
        game.dust(my_id).await;
      })
    },
  }
});
