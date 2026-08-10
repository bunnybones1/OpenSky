use super::effect_helpers::*;
use rand::SeedableRng;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);
        let public_entropy = game.get_entropy().await;

        if let Some(drawn_card) = game
          .context
          .reveal_unique(
            enemy_player,
            move |secret| {
              let deck_1c_units = secret
                .deck()
                .into_iter()
                .map(|c| {
                  secret
                    .instance(*c)
                    .expect("cards in deck are secret")
                    .clone()
                })
                .filter(|c| c.is_unit() && c.cost == 1)
                .collect_vec();
              let mut rng = rand_xorshift::XorShiftRng::from_seed(public_entropy);
              deck_1c_units.choose(&mut rng).cloned()
            },
            |_| true,
          )
          .await
        {
          if let Some(summoned_copy) = game.instantiate_and_summon(owner, *drawn_card.base()).await
          {
            game
              .modify_card_single(summoned_copy, Modifier::GrantTrait(Trait::Dash))
              .await;
          }
        }
      })
    },
  }
});
