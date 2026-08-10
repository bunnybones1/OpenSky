use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        game.add_to_hand(owner, BaseCard::C138).await;
        game.add_to_hand(owner, BaseCard::C138).await;
        let units = game.units::<Card>(owner);
        let mut rng = game.context().random().await;
        let picked = units.iter().choose(&mut rng);
        if let Some(picked) = picked {
          game
            .modify_card_single(picked, Modifier::ModifyPower(1, None))
            .await;
        }
      })
    },
  }
});
