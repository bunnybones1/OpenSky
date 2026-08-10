use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      let num_elements = game
        .graveyard::<&CardInstance<SkyWeaver>>(owner)
        .iter()
        .map(|c| c.base().instance().element)
        .unique()
        .count() as i8;
      -num_elements
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let first_spell = game.draw(owner, |c, _| c.is_spell()).await;
        if let Some(id) = first_spell {
          let first_element = game.reveal_from_card(id, |c| c.element).await;
          game
            .draw(owner, move |c, _| {
              c.is_spell() && c.element != first_element
            })
            .await;
        }
      })
    },
  }
});
