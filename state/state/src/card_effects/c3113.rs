use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let top_most_expensive_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .map(|c| (c.id(), c.base().instance().cost))
          .rev() // so last is top
          .max_by_key(|(_, cost)| *cost)
          .map(|(c, _)| c);

        if let Some(id) = top_most_expensive_dead_unit {
          game.summon(id).await;
          game
            .modify_card(
              id,
              vec![
                Modifier::SetHealth(1.into()),
                Modifier::GrantTrait(Trait::Dash),
              ],
            )
            .await;
          game.give_spell(id, BaseCard::C20047).await;
        }
      })
    },
  }
});
