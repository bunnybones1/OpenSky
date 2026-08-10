use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.instantiate_and_summon(owner, BaseCard::C20063).await;
      })
    },
  }
});
