use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let mut rng = game.context().random().await;

        let mut mercurial_ability_bases = vec![
          BaseCard::C25015,
          BaseCard::C25016,
          BaseCard::C25017,
          BaseCard::C25019,
          BaseCard::C25020,
          BaseCard::C25021,
        ];
        for _ in 0..2 {
          let picked_ability_base = *mercurial_ability_bases.iter().choose(&mut rng).unwrap();
          let card = game.create_card(owner, picked_ability_base).await;
          game.move_to_zone(card, Zone::Casting).await;
          game
            .resolve_card_effect_as_player(card, None, 1.into())
            .await;
          game.move_to_zone(card, Zone::Dust { public: false }).await;
          mercurial_ability_bases.retain(|b| b != &picked_ability_base);
        }
      })
    },
  }
});
