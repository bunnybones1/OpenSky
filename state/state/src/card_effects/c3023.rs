use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, secret, player, id, card| targets::any_hero(game, secret, player, id, card)
      && {
        game
          .graveyard::<&CardInstance<SkyWeaver>>(game.owner(card))
          .into_iter()
          .filter(|c| c.is_unit())
          .count()
          > 1
      },
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let target_owner = game.owner(target);
        let top_two_dead_units: Vec<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(target_owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .map(|c| c.id())
          .take(2)
          .collect();

        for dead_unit in top_two_dead_units {
          game.dust(dead_unit).await;
          game.instantiate_and_summon(owner, BaseCard::C3148).await;
        }
      })
    },
  }
});
