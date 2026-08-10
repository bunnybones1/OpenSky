use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let wood = game.instantiate_and_summon(owner, BaseCard::C20003).await;
        if let Some(wood) = wood {
          let num_elements_in_grave = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .map(|c| c.base().instance().element)
            .unique()
            .count() as i8;
          game
            .berf(wood, num_elements_in_grave, num_elements_in_grave)
            .await;
        }
      })
    },
  }
});
