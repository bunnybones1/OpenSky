use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| Box::pin(async move {
      cup_effect(game, owner).await;
      let hero = game.hero(owner);

      if hero.health <= 16 {
        cup_effect(game, owner).await;
      }
    })
  }
});

async fn cup_effect(game: &mut LiveGame<'_>, owner: Player) {
  if let Some(unit) = game.draw_into_play(owner, |c, _| c.cost == 2).await {
    game
      .modify_card(unit, vec![Modifier::GrantTrait(Trait::Dash)])
      .await;
  }
}
