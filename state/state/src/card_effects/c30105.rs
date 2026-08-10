use super::effect_helpers::*;

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let horde_size = game
          .hero(game.owner(my_id))
          .effects
          .iter()
          .find_map(|m| match m {
            CardEffect::Horde(horde_size) => Some(*horde_size),
            _ => None,
          })
          .unwrap_or(0);
        game.remove_modifiers_from_source(hero, hero).await;
        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::Horde(horde_size + 1)),
            false,
            0,
          )
          .await;
      })
    },
  }
});
