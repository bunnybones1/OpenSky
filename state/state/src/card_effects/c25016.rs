use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let enemy_units = game.enemy_units(owner);
        game
          .smart_random_modify(
            vec![
              Modifier::ModifyHealth(-1, None),
              Modifier::ModifyPower(-1, None),
            ],
            enemy_units,
          )
          .await;
      })
    },
  }
});
