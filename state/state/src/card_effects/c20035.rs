use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, _, c| {
      c.instance(g, None).unwrap().is_unit() && all_dead_dark_cards_count(g) > 0
    },
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let debuff = -i8::from(SaturatingU8::from(all_dead_dark_cards_count(game)));
        game.berf(target, debuff, debuff).await;
        if target
          .instance(game, None)
          .unwrap()
          .marked_for_death
          .is_some()
        {
          game.dust(target).await;
        }
      })
    },
  }
});
fn all_dead_dark_cards_count(game: &GameState<SkyWeaver>) -> usize {
  [0u8, 1u8].iter().fold(0, |last, p_id| {
    last
      + game
        .graveyard::<&CardInstance<SkyWeaver>>(*p_id)
        .iter()
        .filter(|c| c.base().instance().element == Element::Dark)
        .count()
  })
}
