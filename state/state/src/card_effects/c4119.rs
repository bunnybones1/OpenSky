use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let spell = game.draw_and_cast_spell(owner).await;
          if let Some(spell) = spell {
            let id = game.reveal_from_card(spell, |c| c.id()).await;

            game.cast_spell_on_enemies(id, |_| true, false, false).await;
            game.cleanup_dead_units().await;
          }
        }
      })
    },
  }
});
