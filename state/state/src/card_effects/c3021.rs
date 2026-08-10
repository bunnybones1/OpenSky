use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let ally_units = game.units::<Card>(owner);
        for ally_id in &ally_units {
          game
            .modify_card_single(*ally_id, Modifier::GrantTrait(Trait::Banner))
            .await;
        }
        game.give_spell_many(&ally_units, BaseCard::C20019).await;
      })
    },
  }
});
