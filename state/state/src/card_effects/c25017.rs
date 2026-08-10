use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let units = game.units::<Card>(owner);
        let mut rng = game.context().random().await;
        let picked = units.iter().choose(&mut rng);
        if let Some(picked) = picked {
          game.berf(picked, 1, 1).await;
        }
      })
    },
  }
});
