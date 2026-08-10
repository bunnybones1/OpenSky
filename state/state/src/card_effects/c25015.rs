use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game
          .modify_card_single(hero, Modifier::ModifyHealth(2, None))
          .await;
      })
    },
  }
});
